from fastapi import APIRouter, HTTPException
from appwrite_client import tables_db, databases
from cache import get_cache, set_cache, invalidate_cache
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel
import os
import json

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")

# Appwrite v1.8 renamed system fields: $id → id, $createdAt → createdat, etc.
_FIELD_MAP = {
    "id": "$id",
    "createdat": "$createdAt",
    "updatedat": "$updatedAt",
    "permissions": "$permissions",
    "collectionid": "$collectionId",
    "databaseid": "$databaseId",
}


def to_dict(doc):
    """Convert Appwrite Row/Document to a plain dict with normalized $ prefixed system fields."""
    if isinstance(doc, dict):
        d = dict(doc)
    elif hasattr(doc, "to_map"):
        d = doc.to_map()
    else:
        d = vars(doc)

    # Remap new flat field names back to the $ prefixed names the frontend expects
    for new_key, old_key in _FIELD_MAP.items():
        if new_key in d and old_key not in d:
            d[old_key] = d.pop(new_key)

    return d

def docs_list(result):
    """Extract and convert rows/documents from a TablesDB or legacy Databases response."""
    if isinstance(result, dict):
        # TablesDB returns {"rows": [...]}; legacy Databases returned {"documents": [...]}
        raw = result.get("rows", result.get("documents", []))
    else:
        raw = getattr(result, "rows", None) or getattr(result, "documents", [])
    return [to_dict(d) for d in raw]

class CreateStorePayload(BaseModel):
    name: str
    category: str
    address: str
    description: str
    latitude: float
    longitude: float
    ownerId: str
    phone: str | None = None
    images: list[str] | None = None

@router.get("/my")
def get_my_stores(ownerId: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"my-stores:{ownerId}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        result = tables_db.list_rows(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.select(["*"]), Query.equal("ownerId", ownerId)],
        )
        documents = docs_list(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    set_cache(cache_key, documents)
    return {"source": "db", "data": documents}

@router.get("/debug/raw")
def debug_raw(limit: int = 1):
    """Diagnostic — returns the UNMODIFIED response from Appwrite so we can see
    exactly which keys come back. Compares tables_db.list_rows vs databases.list_documents.
    """
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    out = {}
    try:
        out["tables_db_list_rows"] = tables_db.list_rows(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.limit(limit)],
        )
    except Exception as e:
        out["tables_db_list_rows_error"] = repr(e)

    try:
        out["tables_db_list_rows_with_select"] = tables_db.list_rows(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.select(["*"]), Query.limit(limit)],
        )
    except Exception as e:
        out["tables_db_list_rows_with_select_error"] = repr(e)

    try:
        out["databases_list_documents"] = databases.list_documents(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.limit(limit)],
        )
    except Exception as e:
        out["databases_list_documents_error"] = repr(e)

    try:
        out["databases_list_documents_with_select"] = databases.list_documents(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.select(["name", "category", "address"]), Query.limit(limit)],
        )
    except Exception as e:
        out["databases_list_documents_with_select_error"] = repr(e)

    # Also list named columns explicitly via tables_db
    try:
        out["tables_db_named_select"] = tables_db.list_rows(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.select(["name", "category", "address", "latitude", "longitude"]), Query.limit(limit)],
        )
    except Exception as e:
        out["tables_db_named_select_error"] = repr(e)

    return out

@router.get("/{id}")
def get_store_by_id(id: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"store:{id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        raw = tables_db.get_row(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            id,
            queries=[Query.select(["*"])],
        )
        doc = to_dict(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    payload = {
        **doc,
        "reviews": doc.get("reviews") or [],
        "gallery": doc.get("gallery") or [],
        "facilities": doc.get("facilities") or [],
        "agent": doc.get("agent"),
    }

    set_cache(cache_key, payload)
    return {"source": "db", "data": payload}

@router.get("/")
def get_stores(
    limit: int = 10,
    offset: int = 0,
    query: str | None = None,
    category: str | None = None,
):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = (
        f"stores:{limit}:{offset}:{query or 'all'}:{category or 'all'}"
    )

    # ✅ CACHE READ
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        documents = []

        # 🔍 SEARCH (MATCH JS SDK BEHAVIOR)
        if query:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            # Pull enough candidates first, then paginate after merge+dedupe.
            # This avoids page gaps/duplicates caused by offsetting each branch separately.
            candidate_limit = max(limit + offset, limit)

            by_name = tables_db.list_rows(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    Query.select(["*"]),
                    *base_filters,
                    Query.search("name", query),
                    Query.limit(candidate_limit),
                    Query.offset(0),
                ],
            )

            by_address = tables_db.list_rows(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    Query.select(["*"]),
                    *base_filters,
                    Query.search("address", query),
                    Query.limit(candidate_limit),
                    Query.offset(0),
                ],
            )

            # 🔁 MERGE + DEDUPLICATE
            merged = {}
            for doc in docs_list(by_name) + docs_list(by_address):
                merged[doc["$id"]] = doc

            merged_documents = list(merged.values())

            # Keep ordering stable across pages
            merged_documents.sort(
                key=lambda d: d.get("$createdAt", ""),
                reverse=True,
            )

            # Apply pagination only once after merge
            documents = merged_documents[offset : offset + limit]

        # 📦 NO SEARCH → NORMAL LISTING
        else:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            result = tables_db.list_rows(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    Query.select(["*"]),
                    *base_filters,
                    Query.order_desc("$createdAt"),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )
            documents = docs_list(result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # ✅ CACHE WRITE
    set_cache(cache_key, documents)

    return {"source": "db", "data": documents}

@router.post("/")
def create_store(payload: CreateStorePayload):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        data = {
            "name": payload.name,
            "category": payload.category,
            "address": payload.address,
            "description": payload.description,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "ownerId": payload.ownerId,
            "rating": 0,
            "image": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
        }
        if payload.phone:
            data["phone"] = payload.phone
        if payload.images:
            data["images"] = payload.images

        created = tables_db.create_row(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            ID.unique(),
            data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{payload.ownerId}")

    return {"ok": True, "data": to_dict(created)}

@router.delete("/{id}")
def delete_store(id: str, ownerId: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, STORES_COLLECTION_ID, id, queries=[Query.select(["*"])])
        doc = to_dict(raw)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Store not found")

    if doc.get("ownerId") != ownerId:
        raise HTTPException(status_code=403, detail="Not authorized to delete this store")

    try:
        tables_db.delete_row(DATABASE_ID, STORES_COLLECTION_ID, id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{ownerId}")
    invalidate_cache(f"store:{id}")

    return {"ok": True}

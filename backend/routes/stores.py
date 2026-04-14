from fastapi import APIRouter, HTTPException
from appwrite_client import tables_db
from cache import get_cache, set_cache, invalidate_cache
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")


# Appwrite v1.8 TablesDB responses use flat (no-$) system field names in some places.

# Frontend code (isValidStore, etc.) expects $-prefixed names. Map both directions.
_FIELD_MAP = {
    "id": "$id",
    "createdat": "$createdAt",
    "updatedat": "$updatedAt",
    "permissions": "$permissions",
    "databaseid": "$databaseId",
    "collectionid": "$collectionId",
    "sequence": "$sequence",
    "tableid": "$tableId",
}


def _normalize(doc):
    """Normalize an Appwrite v1.8 row/document to a plain dict with $-prefixed system fields.
    Keeps ALL other keys (column data) untouched.
    """
    if doc is None:
        return None
    if not isinstance(doc, dict):
        # Typed SDK model → try to_map(), then __dict__
        if hasattr(doc, "to_map") and callable(doc.to_map):
            doc = doc.to_map()
        elif hasattr(doc, "__dict__"):
            doc = dict(vars(doc))
        else:
            return doc
    out = {}
    for k, v in doc.items():
        key = _FIELD_MAP.get(k, k)
        out[key] = v
    return out


def _rows(result):
    """Extract row list from list_rows response (dict with 'rows' or 'documents' key)."""
    if result is None:
        return []
    if not isinstance(result, dict):
        if hasattr(result, "to_map") and callable(result.to_map):
            result = result.to_map()
        elif hasattr(result, "__dict__"):
            result = dict(vars(result))
        else:
            return []
    raw = result.get("rows") or result.get("documents") or []
    return [_normalize(r) for r in raw]


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
            queries=[Query.equal("ownerId", ownerId)],
        )
        documents = _rows(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    set_cache(cache_key, documents)
    return {"source": "db", "data": documents}


@router.get("/{id}")
def get_store_by_id(id: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"store:{id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        raw = tables_db.get_row(DATABASE_ID, STORES_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    payload = {
        **(doc or {}),
        "reviews": (doc or {}).get("reviews") or [],
        "gallery": (doc or {}).get("gallery") or [],
        "facilities": (doc or {}).get("facilities") or [],
        "agent": (doc or {}).get("agent"),
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

    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        documents = []

        if query:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            candidate_limit = max(limit + offset, limit)

            by_name = tables_db.list_rows(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
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
                    *base_filters,
                    Query.search("address", query),
                    Query.limit(candidate_limit),
                    Query.offset(0),
                ],
            )

            merged = {}
            for doc in _rows(by_name) + _rows(by_address):
                if doc.get("$id"):
                    merged[doc["$id"]] = doc

            merged_documents = list(merged.values())
            merged_documents.sort(
                key=lambda d: d.get("$createdAt", ""),
                reverse=True,
            )
            documents = merged_documents[offset : offset + limit]

        else:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            result = tables_db.list_rows(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    *base_filters,
                    Query.order_desc("$createdAt"),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )
            documents = _rows(result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

    return {"ok": True, "data": _normalize(created)}


@router.delete("/{id}")
def delete_store(id: str, ownerId: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, STORES_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
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

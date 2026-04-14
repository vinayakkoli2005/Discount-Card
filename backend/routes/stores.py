from fastapi import APIRouter, HTTPException
from appwrite_client import databases
from cache import get_cache, set_cache, invalidate_cache
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")

def to_dict(doc):
    """Convert Appwrite Document (dict, dict subclass, or typed object) to plain dict."""
    if isinstance(doc, dict):
        return dict(doc)          # handles plain dicts AND dict subclasses (old SDK)
    if hasattr(doc, "to_map"):
        return doc.to_map()       # newer SDK typed Document objects
    return vars(doc)              # last resort

def docs_list(result):
    """Extract and convert documents from a DocumentList or plain dict response."""
    if isinstance(result, dict):
        raw = result.get("documents", [])
    else:
        raw = getattr(result, "documents", [])
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
        result = databases.list_documents(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.equal("ownerId", ownerId)],
        )
        documents = docs_list(result)
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
        raw = databases.get_document(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            id,
            queries=[
                Query.select([
                    "*",
                    "agent.*",
                    "reviews.*",
                    "gallery.*",
                ]),
            ],
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

            by_name = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    *base_filters,
                    Query.search("name", query),
                    Query.limit(candidate_limit),
                    Query.offset(0),
                ],
            )

            by_address = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
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

            result = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
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

        created = databases.create_document(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            ID.unique(),
            data=data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{payload.ownerId}")

    return {"ok": True, "data": created}

@router.delete("/{id}")
def delete_store(id: str, ownerId: str):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = databases.get_document(DATABASE_ID, STORES_COLLECTION_ID, id)
        doc = to_dict(raw)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Store not found")

    if doc.get("ownerId") != ownerId:
        raise HTTPException(status_code=403, detail="Not authorized to delete this store")

    try:
        databases.delete_document(DATABASE_ID, STORES_COLLECTION_ID, id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{ownerId}")
    invalidate_cache(f"store:{id}")

    return {"ok": True}

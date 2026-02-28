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
#yyoo

class CreateStorePayload(BaseModel):
    name: str
    category: str
    address: str
    description: str
    latitude: float
    longitude: float
    ownerId: str

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
        documents = result["documents"]
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
        doc = databases.get_document(
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

            by_name = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    *base_filters,
                    Query.search("name", query),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )

            by_address = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    *base_filters,
                    Query.search("address", query),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )

            # 🔁 MERGE + DEDUPLICATE
            merged = {}
            for doc in by_name["documents"] + by_address["documents"]:
                merged[doc["$id"]] = doc

            documents = list(merged.values())

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
            documents = result["documents"]

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
        created = databases.create_document(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            ID.unique(),
            data={
                "name": payload.name,
                "category": payload.category,
                "address": payload.address,
                "description": payload.description,
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "ownerId": payload.ownerId,
                "rating": 0,
                "image": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{payload.ownerId}")

    return {"ok": True, "data": created}

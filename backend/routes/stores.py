from fastapi import APIRouter, HTTPException
from appwrite_client import databases
from cache import get_cache, set_cache
from appwrite.query import Query
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")


@router.get("/")
def get_stores(
    limit: int = 10,
    offset: int = 0,
    query: str | None = None,
):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"stores:{limit}:{offset}:{query or 'all'}"

    # ✅ READ cache
    cached = get_cache(cache_key)
    if cached:
        return {"source": "cache", "data": cached}

    queries = [
        Query.limit(limit),
        Query.offset(offset),
        Query.order_desc("$createdAt"),
    ]

    # ✅ SAFE SEARCH (NO Query.or_)
    if query:
        queries.append(Query.search("name", query))
        queries.append(Query.search("address", query))

    try:
        result = databases.list_documents(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=queries,
        )
    except Exception as e:
        # show exact error in Render logs
        raise HTTPException(status_code=500, detail=str(e))

    documents = result["documents"]

    set_cache(cache_key, documents)

    return {"source": "db", "data": documents}

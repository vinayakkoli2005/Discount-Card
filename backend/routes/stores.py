from fastapi import APIRouter, HTTPException
from appwrite_client import databases
from cache import get_cache, set_cache
from appwrite.query import Query
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")


@router.get("/")
def get_stores(limit: int = 10, offset: int = 0):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"stores:{limit}:{offset}"

    # ✅ correct cache read
    cached = get_cache(cache_key)
    if cached:
        return {
            "source": "cache",
            "data": cached
        }

    try:
        result = databases.list_documents(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[
                Query.limit(limit),
                Query.offset(offset),
                Query.order_desc("$createdAt"),
            ]
        )
    except Exception as e:
        # makes Render logs readable
        raise HTTPException(status_code=500, detail=str(e))

    documents = result["documents"]

    # ✅ correct cache write
    set_cache(cache_key, documents)

    return {
        "source": "db",
        "data": documents
    }

from fastapi import APIRouter
from appwrite_client import databases
from cache import set_cache, set_cache
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")


@router.get("/")
def get_stores(limit: int = 10, offset: int = 0):
    cache_key = f"stores:{limit}:{offset}"

    cached = set_cache(cache_key)
    if cached:
        return {
            "source": "cache",
            "data": cached
        }

    result = databases.list_documents(
        DATABASE_ID,
        STORES_COLLECTION_ID,
        queries=[
            f"limit({limit})",
            f"offset({offset})",
            "orderDesc($createdAt)"
        ]
    )

    documents = result["documents"]

    set_cache(cache_key, documents)

    return {
        "source": "db",
        "data": documents
    }

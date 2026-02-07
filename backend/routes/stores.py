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

    # ✅ CACHE READ
    cached = get_cache(cache_key)
    if cached:
        return {"source": "cache", "data": cached}

    try:
        documents = []

        # 🔍 SEARCH (MATCH JS SDK BEHAVIOR)
        if query:
            by_name = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
                    Query.search("name", query),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )

            by_address = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
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
            result = databases.list_documents(
                DATABASE_ID,
                STORES_COLLECTION_ID,
                queries=[
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

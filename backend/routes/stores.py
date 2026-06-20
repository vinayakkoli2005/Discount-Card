from fastapi import APIRouter, HTTPException, Depends
from appwrite_client import tables_db
from cache import get_cache, set_cache, invalidate_cache
from auth import verify_user
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel, Field
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")

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
    if doc is None:
        return None
    if not isinstance(doc, dict):
        if hasattr(doc, "to_map") and callable(doc.to_map):
            doc = doc.to_map()
        elif hasattr(doc, "__dict__"):
            doc = dict(vars(doc))
        else:
            return doc
    out = {}
    for k, v in doc.items():
        out[_FIELD_MAP.get(k, k)] = v
    return out


def _rows(result):
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
    name: str = Field(max_length=200)
    category: str = Field(max_length=100)
    address: str = Field(max_length=500)
    description: str = Field(max_length=2000)
    latitude: float
    longitude: float
    phone: str | None = Field(default=None, max_length=20)
    images: list[str] | None = None


class UpdateStorePayload(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = Field(default=None, max_length=20)
    images: list[str] | None = None


@router.get("/my")
def get_my_stores(user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"my-stores:{user_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        result = tables_db.list_rows(
            DATABASE_ID,
            STORES_COLLECTION_ID,
            queries=[Query.equal("ownerId", user_id)],
        )
        documents = _rows(result)
    except Exception as e:
        logger.error("get_my_stores error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch stores")

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
        logger.error("get_store_by_id error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch store")

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

    cache_key = f"stores:{limit}:{offset}:{query or 'all'}:{category or 'all'}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        if query:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            candidate_limit = max(limit + offset, limit)

            by_name = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[*base_filters, Query.search("name", query),
                         Query.limit(candidate_limit), Query.offset(0)],
            )
            by_address = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[*base_filters, Query.search("address", query),
                         Query.limit(candidate_limit), Query.offset(0)],
            )

            merged: dict = {}
            for doc in _rows(by_name) + _rows(by_address):
                if doc.get("$id"):
                    merged[doc["$id"]] = doc

            sorted_docs = sorted(merged.values(), key=lambda d: d.get("$createdAt", ""), reverse=True)
            documents = sorted_docs[offset: offset + limit]

        else:
            base_filters = []
            if category and category != "All":
                base_filters.append(Query.equal("category", category))

            result = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[*base_filters, Query.order_desc("$createdAt"),
                         Query.limit(limit), Query.offset(offset)],
            )
            documents = _rows(result)

    except Exception as e:
        logger.error("get_stores error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch stores")

    set_cache(cache_key, documents)
    return {"source": "db", "data": documents}


@router.post("/")
def create_store(payload: CreateStorePayload, user_id: str = Depends(verify_user)):
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
            "ownerId": user_id,
            "rating": 0,
            "image": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
        }
        if payload.phone:
            data["phone"] = payload.phone
        if payload.images:
            data["images"] = payload.images

        created = tables_db.create_row(DATABASE_ID, STORES_COLLECTION_ID, ID.unique(), data)
    except Exception as e:
        logger.error("create_store error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create store")

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{user_id}")
    return {"ok": True, "data": _normalize(created)}


@router.delete("/{id}")
def delete_store(id: str, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, STORES_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Store not found")

    if doc.get("ownerId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        tables_db.delete_row(DATABASE_ID, STORES_COLLECTION_ID, id)
    except Exception as e:
        logger.error("delete_store error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to delete store")

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{user_id}")
    invalidate_cache(f"store:{id}")
    return {"ok": True}


@router.put("/{id}")
def update_store(id: str, payload: UpdateStorePayload, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, STORES_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Store not found")

    if doc.get("ownerId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    data: dict = {}
    if payload.name is not None:
        data["name"] = payload.name
    if payload.category is not None:
        data["category"] = payload.category
    if payload.address is not None:
        data["address"] = payload.address
    if payload.description is not None:
        data["description"] = payload.description
    if payload.latitude is not None:
        data["latitude"] = payload.latitude
    if payload.longitude is not None:
        data["longitude"] = payload.longitude
    if payload.phone is not None:
        data["phone"] = payload.phone
    if payload.images is not None:
        data["images"] = payload.images

    if not data:
        return {"ok": True, "data": doc}

    try:
        updated = tables_db.update_row(DATABASE_ID, STORES_COLLECTION_ID, id, data)
    except Exception as e:
        logger.error("update_store error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update store")

    invalidate_cache("stores:")
    invalidate_cache(f"my-stores:{user_id}")
    invalidate_cache(f"store:{id}")
    return {"ok": True, "data": _normalize(updated)}

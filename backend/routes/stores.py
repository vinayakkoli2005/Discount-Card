from fastapi import APIRouter, HTTPException, Depends, Response
from appwrite_client import tables_db
from auth import verify_user
from db_utils import normalize as _normalize, rows as _rows
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel, Field
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
STORES_COLLECTION_ID = os.getenv("APPWRITE_PROPERTIES_COLLECTION_ID")


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
def get_my_stores(response: Response, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

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

    response.headers["Cache-Control"] = "private, max-age=30"
    return {"source": "db", "data": documents}


@router.get("/{id}")
def get_store_by_id(id: str, response: Response):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

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

    response.headers["Cache-Control"] = "public, max-age=60"
    return {"source": "db", "data": payload}


@router.get("/")
def get_stores(
    response: Response,
    limit: int = 10,
    offset: int = 0,
    query: str | None = None,
    category: str | None = None,
):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        base_filters = []
        if category and category != "All":
            base_filters.append(Query.equal("category", category))

        if query:
            # Fetch up to 200 results from name search with fulltext index,
            # then apply offset/limit in memory so pagination is correct.
            name_result = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[*base_filters, Query.search("name", query), Query.limit(200)],
            )
            merged: dict = {}
            for doc in _rows(name_result):
                if doc.get("$id"):
                    merged[doc["$id"]] = doc

            # Secondary address search to broaden results
            addr_result = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[*base_filters, Query.search("address", query), Query.limit(200)],
            )
            for doc in _rows(addr_result):
                if doc.get("$id") and doc["$id"] not in merged:
                    merged[doc["$id"]] = doc

            sorted_docs = sorted(
                merged.values(),
                key=lambda d: d.get("$createdAt", ""),
                reverse=True,
            )
            documents = sorted_docs[offset: offset + limit]
        else:
            result = tables_db.list_rows(
                DATABASE_ID, STORES_COLLECTION_ID,
                queries=[
                    *base_filters,
                    Query.order_desc("$createdAt"),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            )
            documents = _rows(result)

    except Exception as e:
        logger.error("get_stores error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch stores")

    response.headers["Cache-Control"] = "public, max-age=30"
    return {"source": "db", "data": documents}


@router.post("/")
def create_store(payload: CreateStorePayload, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not STORES_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

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

    try:
        created = tables_db.create_row(DATABASE_ID, STORES_COLLECTION_ID, ID.unique(), data)
    except Exception as e:
        logger.error("create_store error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create store")

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
    for field, val in [
        ("name", payload.name), ("category", payload.category),
        ("address", payload.address), ("description", payload.description),
        ("latitude", payload.latitude), ("longitude", payload.longitude),
        ("phone", payload.phone), ("images", payload.images),
    ]:
        if val is not None:
            data[field] = val

    if not data:
        return {"ok": True, "data": doc}

    try:
        updated = tables_db.update_row(DATABASE_ID, STORES_COLLECTION_ID, id, data)
    except Exception as e:
        logger.error("update_store error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update store")

    return {"ok": True, "data": _normalize(updated)}

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
PRODUCTS_COLLECTION_ID = os.getenv("APPWRITE_PRODUCTS_COLLECTION_ID")


class CreateProductPayload(BaseModel):
    store_id: str
    name: str = Field(max_length=200)
    category: str = Field(default="", max_length=100)
    price: float | None = None
    description: str | None = Field(default=None, max_length=1000)
    image_id: str | None = None


class UpdateProductPayload(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    price: float | None = None
    description: str | None = Field(default=None, max_length=1000)


@router.get("/")
def get_products(storeId: str, response: Response):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        result = tables_db.list_rows(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            queries=[Query.equal("store_id", storeId)],
        )
        products = _rows(result)
    except Exception as e:
        logger.error("get_products error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch products")

    response.headers["Cache-Control"] = "public, max-age=60"
    return {"source": "db", "data": products}


@router.post("/")
def create_product(payload: CreateProductPayload, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    data: dict = {
        "store_id": payload.store_id,
        "owner_id": user_id,
        "name": payload.name,
        "category": payload.category,
    }
    if payload.price is not None:
        data["price"] = payload.price
    if payload.description is not None:
        data["description"] = payload.description
    if payload.image_id is not None:
        data["image_id"] = payload.image_id

    try:
        created = tables_db.create_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, ID.unique(), data)
    except Exception as e:
        logger.error("create_product error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create product")

    return {"ok": True, "data": _normalize(created)}


@router.put("/{id}")
def update_product(id: str, payload: UpdateProductPayload, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")

    if doc.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    data: dict = {}
    for field, val in [
        ("name", payload.name), ("category", payload.category),
        ("price", payload.price), ("description", payload.description),
    ]:
        if val is not None:
            data[field] = val

    if not data:
        return {"ok": True, "data": doc}

    try:
        updated = tables_db.update_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id, data)
    except Exception as e:
        logger.error("update_product error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update product")

    return {"ok": True, "data": _normalize(updated)}


@router.delete("/{id}")
def delete_product(id: str, user_id: str = Depends(verify_user)):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")

    if doc.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        tables_db.delete_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
    except Exception as e:
        logger.error("delete_product error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to delete product")

    return {"ok": True}

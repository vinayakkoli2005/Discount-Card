from fastapi import APIRouter, HTTPException
from appwrite_client import tables_db
from cache import get_cache, set_cache, invalidate_cache
from appwrite.query import Query
from appwrite.id import ID
from pydantic import BaseModel
import os

router = APIRouter()

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
PRODUCTS_COLLECTION_ID = os.getenv("APPWRITE_PRODUCTS_COLLECTION_ID")

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
        key = _FIELD_MAP.get(k, k)
        out[key] = v
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


class CreateProductPayload(BaseModel):
    store_id: str
    owner_id: str
    name: str
    category: str
    price: float | None = None
    description: str | None = None
    image_id: str | None = None


class UpdateProductPayload(BaseModel):
    owner_id: str
    name: str | None = None
    category: str | None = None
    price: float | None = None
    description: str | None = None


@router.get("/")
def get_products(storeId: str):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    cache_key = f"products:{storeId}"
    cached = get_cache(cache_key)
    if cached is not None:
        return {"source": "cache", "data": cached}

    try:
        result = tables_db.list_rows(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            queries=[Query.equal("store_id", storeId)],
        )
        products = _rows(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    set_cache(cache_key, products)
    return {"source": "db", "data": products}


@router.post("/")
def create_product(payload: CreateProductPayload):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    data: dict = {
        "store_id": payload.store_id,
        "owner_id": payload.owner_id,
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
        created = tables_db.create_row(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            ID.unique(),
            data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache(f"products:{payload.store_id}")
    return {"ok": True, "data": _normalize(created)}


@router.put("/{id}")
def update_product(id: str, payload: UpdateProductPayload):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")

    if doc.get("owner_id") != payload.owner_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")

    data: dict = {}
    if payload.name is not None:
        data["name"] = payload.name
    if payload.category is not None:
        data["category"] = payload.category
    if payload.price is not None:
        data["price"] = payload.price
    if payload.description is not None:
        data["description"] = payload.description

    if not data:
        return {"ok": True, "data": doc}

    try:
        updated = tables_db.update_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache(f"products:{doc.get('store_id')}")
    return {"ok": True, "data": _normalize(updated)}


@router.delete("/{id}")
def delete_product(id: str, ownerId: str):
    if not DATABASE_ID or not PRODUCTS_COLLECTION_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")

    if doc.get("owner_id") != ownerId:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")

    try:
        tables_db.delete_row(DATABASE_ID, PRODUCTS_COLLECTION_ID, id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    invalidate_cache(f"products:{doc.get('store_id')}")
    return {"ok": True}

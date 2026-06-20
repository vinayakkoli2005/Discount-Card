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
FAVORITES_TABLE_ID = "favorites"


class AddFavoritePayload(BaseModel):
    storeId: str = Field(max_length=36)


@router.get("/")
def get_favorites(response: Response, user_id: str = Depends(verify_user)):
    if not DATABASE_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")
    try:
        result = tables_db.list_rows(
            DATABASE_ID,
            FAVORITES_TABLE_ID,
            queries=[Query.equal("userId", user_id), Query.limit(200)],
        )
        favorites = _rows(result)
    except Exception as e:
        logger.error("get_favorites error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch favorites")

    response.headers["Cache-Control"] = "private, max-age=30"
    return {"data": favorites}


@router.post("/")
def add_favorite(payload: AddFavoritePayload, user_id: str = Depends(verify_user)):
    if not DATABASE_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    # Prevent duplicate favorites
    try:
        existing = tables_db.list_rows(
            DATABASE_ID,
            FAVORITES_TABLE_ID,
            queries=[
                Query.equal("userId", user_id),
                Query.equal("storeId", payload.storeId),
                Query.limit(1),
            ],
        )
        rows = _rows(existing)
        if rows:
            return {"ok": True, "data": rows[0]}
    except Exception as e:
        logger.error("add_favorite duplicate check error: %s", e)

    try:
        created = tables_db.create_row(
            DATABASE_ID,
            FAVORITES_TABLE_ID,
            ID.unique(),
            {"userId": user_id, "storeId": payload.storeId},
        )
    except Exception as e:
        logger.error("add_favorite error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to add favorite")

    return {"ok": True, "data": _normalize(created)}


@router.delete("/{id}")
def remove_favorite(id: str, user_id: str = Depends(verify_user)):
    if not DATABASE_ID:
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    try:
        raw = tables_db.get_row(DATABASE_ID, FAVORITES_TABLE_ID, id)
        doc = _normalize(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Favorite not found")

    if doc.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        tables_db.delete_row(DATABASE_ID, FAVORITES_TABLE_ID, id)
    except Exception as e:
        logger.error("remove_favorite error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to remove favorite")

    return {"ok": True}

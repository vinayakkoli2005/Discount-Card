"""Basic API tests: auth guard, ownership check, health endpoint."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Provide required env vars before importing app modules
os.environ.setdefault("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
os.environ.setdefault("APPWRITE_PROJECT_ID", "test-project")
os.environ.setdefault("APPWRITE_API_KEY", "test-key")
os.environ.setdefault("APPWRITE_DATABASE_ID", "test-db")
os.environ.setdefault("APPWRITE_PROPERTIES_COLLECTION_ID", "test-stores")
os.environ.setdefault("APPWRITE_PRODUCTS_COLLECTION_ID", "test-products")

from main import app  # noqa: E402

client = TestClient(app)


# ─── Health ──────────────────────────────────────────────────────────────────

def test_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ─── Auth guard ──────────────────────────────────────────────────────────────

def test_unauthenticated_create_store_returns_401():
    res = client.post("/stores/", json={
        "name": "Test", "category": "Food", "address": "123 St",
        "description": "desc", "latitude": 0.0, "longitude": 0.0,
    })
    assert res.status_code == 401


def test_unauthenticated_delete_store_returns_401():
    res = client.delete("/stores/some-id")
    assert res.status_code == 401


def test_unauthenticated_get_favorites_returns_401():
    res = client.get("/favorites/")
    assert res.status_code == 401


def test_malformed_auth_header_returns_401():
    res = client.post(
        "/stores/",
        headers={"Authorization": "NotBearer token"},
        json={"name": "X", "category": "Y", "address": "Z",
              "description": "d", "latitude": 0.0, "longitude": 0.0},
    )
    assert res.status_code == 401


# ─── Ownership check ─────────────────────────────────────────────────────────

def _fake_verify_user_as(user_id: str):
    """Return a dependency override that always resolves to user_id."""
    async def _dep():
        return user_id
    return _dep


def test_delete_store_owned_by_other_user_returns_403():
    from auth import verify_user

    other_owner_doc = {
        "$id": "store-1", "ownerId": "owner-A",
        "name": "Shop", "category": "Food",
    }

    app.dependency_overrides[verify_user] = _fake_verify_user_as("owner-B")

    with patch("routes.stores.tables_db") as mock_db:
        mock_row = MagicMock()
        mock_row.to_map.return_value = other_owner_doc
        mock_db.get_row.return_value = mock_row

        res = client.delete("/stores/store-1")

    app.dependency_overrides.clear()
    assert res.status_code == 403


def test_delete_product_owned_by_other_user_returns_403():
    from auth import verify_user

    other_owner_doc = {
        "$id": "prod-1", "owner_id": "owner-A",
        "name": "Widget", "store_id": "store-1",
    }

    app.dependency_overrides[verify_user] = _fake_verify_user_as("owner-B")

    with patch("routes.products.tables_db") as mock_db:
        mock_row = MagicMock()
        mock_row.to_map.return_value = other_owner_doc
        mock_db.get_row.return_value = mock_row

        res = client.delete("/products/prod-1")

    app.dependency_overrides.clear()
    assert res.status_code == 403


# ─── Search ──────────────────────────────────────────────────────────────────

def test_get_stores_no_query_returns_data():
    empty_result = MagicMock()
    empty_result.to_map.return_value = {"rows": [], "total": 0}

    with patch("routes.stores.tables_db") as mock_db:
        mock_db.list_rows.return_value = empty_result
        res = client.get("/stores/")

    assert res.status_code == 200
    assert res.json()["data"] == []


def test_get_stores_with_query_deduplicates():
    """Search merges name + address results and deduplicates by $id."""
    doc = {"$id": "s1", "name": "Pizza Place", "address": "Main St", "$createdAt": "2024-01-01"}

    result_with_dup = MagicMock()
    result_with_dup.to_map.return_value = {"rows": [doc, doc]}

    with patch("routes.stores.tables_db") as mock_db:
        mock_db.list_rows.return_value = result_with_dup
        res = client.get("/stores/?query=pizza")

    assert res.status_code == 200
    assert len(res.json()["data"]) == 1

"""Shared helpers for normalising Appwrite TablesDB row dicts."""

_FIELD_MAP: dict[str, str] = {
    "id": "$id",
    "createdat": "$createdAt",
    "updatedat": "$updatedAt",
    "permissions": "$permissions",
    "databaseid": "$databaseId",
    "collectionid": "$collectionId",
    "sequence": "$sequence",
    "tableid": "$tableId",
}


def normalize(doc) -> dict | None:
    if doc is None:
        return None
    if not isinstance(doc, dict):
        if hasattr(doc, "to_map") and callable(doc.to_map):
            doc = doc.to_map()
        elif hasattr(doc, "__dict__"):
            doc = dict(vars(doc))
        else:
            return doc
    return {_FIELD_MAP.get(k, k): v for k, v in doc.items()}


def rows(result) -> list[dict]:
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
    return [normalize(r) for r in raw]

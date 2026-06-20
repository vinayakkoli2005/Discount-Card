from fastapi import Header, HTTPException
from appwrite.client import Client
from appwrite.services.account import Account
import os

_ENDPOINT = os.getenv("APPWRITE_ENDPOINT")
_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID")


async def verify_user(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency — verifies an Appwrite JWT and returns the authenticated user $id.

    Frontend must send:  Authorization: Bearer <jwt>
    JWT is obtained via account.createJWT() in the React Native SDK.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    jwt = authorization[len("Bearer "):]

    client = Client()
    client.set_endpoint(_ENDPOINT)
    client.set_project(_PROJECT_ID)
    client.set_jwt(jwt)

    try:
        result = Account(client).get()

        if isinstance(result, dict):
            uid = result.get("$id")
        elif hasattr(result, "to_map") and callable(result.to_map):
            uid = result.to_map().get("$id")
        elif hasattr(result, "__dict__"):
            d = vars(result)
            uid = d.get("$id") or d.get("id")
        else:
            uid = None

        if not uid:
            raise ValueError("Could not extract user ID")

        return uid

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication required")

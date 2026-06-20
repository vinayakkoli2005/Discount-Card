import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routes.stores import router as stores_router
from routes.products import router as products_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
] or ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Discount Card API starting up")
    yield
    logger.info("Discount Card API shutting down")


app = FastAPI(title="Discount Card API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(stores_router, prefix="/stores")
app.include_router(products_router, prefix="/products")


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/delete-account", response_class=HTMLResponse)
def delete_account():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delete Account — Volo</title>
      <style>
        body { font-family: sans-serif; max-width: 520px; margin: 60px auto; padding: 0 24px; color: #191D31; }
        h2 { color: #0061FF; }
        a { color: #0061FF; }
      </style>
    </head>
    <body>
      <h2>Request Account Deletion</h2>
      <p>To delete your Volo account and all associated data, send an email to:</p>
      <p><strong><a href="mailto:vinayak23597@iiitd.ac.in">vinayak23597@iiitd.ac.in</a></strong></p>
      <p>Use the subject line: <strong>Account Deletion Request</strong></p>
      <p>Include the email address linked to your account. We will delete your account and all data within 30 days.</p>
    </body>
    </html>
    """

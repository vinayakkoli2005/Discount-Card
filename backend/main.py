from fastapi import FastAPI
from routes.stores import router as stores_router

app = FastAPI(title="Discount Card API")

app.include_router(stores_router, prefix="/stores")


@app.get("/")
def health_check():
    return {"status": "ok"}

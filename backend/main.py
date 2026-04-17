from fastapi import FastAPI
from routes.stores import router as stores_router
from routes.products import router as products_router

app = FastAPI(title="Discount Card API")

app.include_router(stores_router, prefix="/stores")
app.include_router(products_router, prefix="/products")


@app.get("/")
def health_check():
    return {"status": "ok"}

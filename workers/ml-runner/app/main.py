from fastapi import FastAPI
from app.routes import router

app = FastAPI(title="Factum ML Runner", version="0.1.0")
app.include_router(router)


@app.get("/health")
def health():
    return {"ok": True}

from fastapi import APIRouter
from app.api.v1.endpoints import documents, pdf, article_queue

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(pdf.router, prefix="/pdf", tags=["PDF"])
api_router.include_router(article_queue.router, prefix="/article-queue", tags=["Article Queue"]) 
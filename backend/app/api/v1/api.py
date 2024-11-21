from fastapi import APIRouter
from app.api.v1.endpoints import documents, article_queue

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(article_queue.router, prefix="/article-queue", tags=["article-queue"]) 
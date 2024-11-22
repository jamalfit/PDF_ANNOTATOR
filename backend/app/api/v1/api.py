from fastapi import APIRouter
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.pdf import router as pdf_router
from app.api.v1.endpoints.article_queue import router as article_queue_router
from app.api.v1.endpoints.s3 import router as s3_router

api_router = APIRouter()

api_router.include_router(
    documents_router,
    prefix="/documents",
    tags=["Documents"]
)

api_router.include_router(
    pdf_router,
    prefix="/pdf",
    tags=["PDF"]
)

api_router.include_router(
    article_queue_router,
    prefix="/article-queue",
    tags=["Article Queue"]
)

api_router.include_router(
    s3_router,
    prefix="/s3",
    tags=["S3 Operations"]
) 
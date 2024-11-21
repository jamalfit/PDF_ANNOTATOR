from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from app.core.config import settings
from app.api.v1.api import api_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="API for PDF processing and management"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="PDF Segmenter API",
        version="1.0.0",
        description="API for processing and segmenting PDF documents",
        routes=app.routes,
    )

    # Custom schema modifications can go here
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Include routers
app.include_router(
    api_router,
    prefix=settings.API_V1_STR
)

@app.get("/", tags=["Health Check"])
async def root():
    return {"message": "PDF Segmenter API"}

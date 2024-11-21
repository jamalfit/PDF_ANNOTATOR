from fastapi import Request, status
from fastapi.responses import JSONResponse

class PDFProcessingError(Exception):
    def __init__(self, message: str):
        self.message = message

async def pdf_processing_exception_handler(
    request: Request,
    exc: PDFProcessingError
):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.message}
    )

# Add to main.py
app.add_exception_handler(
    PDFProcessingError,
    pdf_processing_exception_handler
) 
from fastapi import APIRouter

from backend.api import schemas

router = APIRouter(prefix="", tags=["status"])


@router.get("/status", response_model=schemas.SimpleResponse)
def get_status() -> schemas.SimpleResponse:
    """Retorna o status básico da API."""
    return schemas.SimpleResponse(status="ok")

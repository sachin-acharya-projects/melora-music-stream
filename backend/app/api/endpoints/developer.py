from fastapi import APIRouter

from app.core.scopes import serialize_scope_catalog

router = APIRouter()


@router.get("/scopes", response_model=list[dict[str, str | bool]])
def list_api_scopes() -> list[dict[str, str | bool]]:
    """Return the canonical scope catalog for developer consent screens."""
    return serialize_scope_catalog()

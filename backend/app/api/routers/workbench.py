from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_active_user, get_workbench_service
from app.application.schemas import (
    ConnectionSchemaResponse,
    TablePreviewResponse,
    WorkbenchMaskPreviewRequest,
    WorkbenchMaskPreviewResponse,
)
from app.application.services.workbench_service import WorkbenchService
from app.core.exceptions import ResourceNotFoundError
from app.domain.entities.user import User
from app.domain.value_objects.graph_element_kind import GraphElementKind

router = APIRouter(prefix="/workbench", tags=["Masking Workbench"])


@router.get("/connections/{connection_id}/schema", response_model=ConnectionSchemaResponse)
async def get_connection_schema(
    connection_id: str,
    service: WorkbenchService = Depends(get_workbench_service),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return await service.get_schema(connection_id, current_user.id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el esquema: {str(exc)}")


@router.get("/connections/{connection_id}/records", response_model=TablePreviewResponse)
async def get_target_records(
    connection_id: str,
    target: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    graph_element: GraphElementKind | None = Query(None),
    service: WorkbenchService = Depends(get_workbench_service),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return await service.get_records(connection_id, current_user.id, target, limit=limit, graph_element=graph_element)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer la muestra: {str(exc)}")


@router.post("/preview", response_model=WorkbenchMaskPreviewResponse)
async def preview_masking(
    request: WorkbenchMaskPreviewRequest,
    service: WorkbenchService = Depends(get_workbench_service),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return await service.preview_mask(request, current_user.id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo generar la vista previa: {str(exc)}")

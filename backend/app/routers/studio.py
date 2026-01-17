from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID
import json

from app.models.schemas import (
    DataTableCreate,
    ReportCreate,
    SlideDeckCreate,
    InfographicCreate,
    StudioOutputResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service
from app.services.persona_utils import build_persona_instructions

router = APIRouter(prefix="/notebooks/{notebook_id}/studio", tags=["studio"])


async def verify_notebook_access(notebook_id: UUID, user_id: str):
    """Verify user has access to the notebook and return notebook data with settings."""
    supabase = get_supabase_client()
    result = (
        supabase.table("notebooks")
        .select("id, settings")
        .eq("id", str(notebook_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return result.data


async def get_sources_content(notebook_id: UUID, source_ids: Optional[List[UUID]] = None):
    """Get content from sources."""
    supabase = get_supabase_client()

    query = supabase.table("sources").select("*").eq("notebook_id", str(notebook_id)).eq("status", "ready")

    if source_ids:
        query = query.in_("id", [str(sid) for sid in source_ids])

    result = query.execute()
    sources = result.data or []

    content_parts = []
    for source in sources:
        source_guide = source.get("source_guide") or {}
        metadata = source.get("metadata") or {}

        if source["type"] == "text" and metadata.get("content"):
            content_parts.append(metadata["content"])
        elif source_guide.get("summary"):
            content_parts.append(source_guide["summary"])

    return "\n\n".join(content_parts), sources


def parse_json_response(text: str) -> dict:
    """Parse JSON from Gemini response, handling markdown code blocks."""
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {"error": "Failed to parse response", "raw": text}


@router.get("/outputs", response_model=ApiResponse)
async def list_studio_outputs(
    notebook_id: UUID,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List all studio outputs for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])

    supabase = get_supabase_client()
    query = supabase.table("studio_outputs").select("*").eq("notebook_id", str(notebook_id))

    if type:
        query = query.eq("type", type)

    result = query.order("created_at", desc=True).execute()

    return ApiResponse(data={"outputs": result.data or []})


@router.get("/outputs/{output_id}", response_model=ApiResponse)
async def get_studio_output(
    notebook_id: UUID,
    output_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific studio output."""
    await verify_notebook_access(notebook_id, user["id"])

    supabase = get_supabase_client()
    result = (
        supabase.table("studio_outputs")
        .select("*")
        .eq("id", str(output_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Studio output not found")

    return ApiResponse(data=result.data)


@router.delete("/outputs/{output_id}")
async def delete_studio_output(
    notebook_id: UUID,
    output_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a studio output."""
    await verify_notebook_access(notebook_id, user["id"])

    supabase = get_supabase_client()
    result = (
        supabase.table("studio_outputs")
        .delete()
        .eq("id", str(output_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    return {"success": True}


@router.post("/data-table", response_model=ApiResponse)
async def generate_data_table(
    notebook_id: UUID,
    request: DataTableCreate,
    user: dict = Depends(get_current_user),
):
    """Generate a data table from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    # Create pending record
    supabase = get_supabase_client()
    source_id_list = [str(s["id"]) for s in sources]

    insert_result = supabase.table("studio_outputs").insert({
        "notebook_id": str(notebook_id),
        "type": "data_table",
        "status": "processing",
        "source_ids": source_id_list,
        "custom_instructions": request.custom_instructions,
    }).execute()

    output_id = insert_result.data[0]["id"]

    try:
        result = await gemini_service.generate_data_table(
            content=content[:50000],
            custom_instructions=request.custom_instructions,
            model_name=request.model,
            persona_instructions=persona_instructions,
        )

        table_data = parse_json_response(result["content"])

        # Update record with results
        supabase.table("studio_outputs").update({
            "status": "completed",
            "title": table_data.get("title", "Data Table"),
            "content": table_data,
            "model_used": result["usage"].get("model_used"),
            "cost_usd": result["usage"].get("cost_usd"),
            "completed_at": "now()",
        }).eq("id", output_id).execute()

        return ApiResponse(
            data={"id": output_id, "content": table_data},
            usage=result["usage"],
        )
    except Exception as e:
        supabase.table("studio_outputs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", output_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report", response_model=ApiResponse)
async def generate_report(
    notebook_id: UUID,
    request: ReportCreate,
    user: dict = Depends(get_current_user),
):
    """Generate a briefing document/report from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    supabase = get_supabase_client()
    source_id_list = [str(s["id"]) for s in sources]

    insert_result = supabase.table("studio_outputs").insert({
        "notebook_id": str(notebook_id),
        "type": "report",
        "status": "processing",
        "source_ids": source_id_list,
        "custom_instructions": request.custom_instructions,
    }).execute()

    output_id = insert_result.data[0]["id"]

    try:
        result = await gemini_service.generate_report(
            content=content[:50000],
            custom_instructions=request.custom_instructions,
            model_name=request.model,
            persona_instructions=persona_instructions,
        )

        report_data = parse_json_response(result["content"])

        supabase.table("studio_outputs").update({
            "status": "completed",
            "title": report_data.get("title", "Briefing Document"),
            "content": report_data,
            "model_used": result["usage"].get("model_used"),
            "cost_usd": result["usage"].get("cost_usd"),
            "completed_at": "now()",
        }).eq("id", output_id).execute()

        return ApiResponse(
            data={"id": output_id, "content": report_data},
            usage=result["usage"],
        )
    except Exception as e:
        supabase.table("studio_outputs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", output_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slide-deck", response_model=ApiResponse)
async def generate_slide_deck(
    notebook_id: UUID,
    request: SlideDeckCreate,
    user: dict = Depends(get_current_user),
):
    """Generate a slide deck from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    supabase = get_supabase_client()
    source_id_list = [str(s["id"]) for s in sources]

    insert_result = supabase.table("studio_outputs").insert({
        "notebook_id": str(notebook_id),
        "type": "slide_deck",
        "status": "processing",
        "source_ids": source_id_list,
        "custom_instructions": request.custom_instructions,
    }).execute()

    output_id = insert_result.data[0]["id"]

    try:
        result = await gemini_service.generate_slide_deck(
            content=content[:50000],
            slide_count=request.slide_count,
            custom_instructions=request.custom_instructions,
            model_name=request.model,
            persona_instructions=persona_instructions,
        )

        slides_data = parse_json_response(result["content"])

        supabase.table("studio_outputs").update({
            "status": "completed",
            "title": slides_data.get("title", "Presentation"),
            "content": slides_data,
            "model_used": result["usage"].get("model_used"),
            "cost_usd": result["usage"].get("cost_usd"),
            "completed_at": "now()",
        }).eq("id", output_id).execute()

        return ApiResponse(
            data={"id": output_id, "content": slides_data},
            usage=result["usage"],
        )
    except Exception as e:
        supabase.table("studio_outputs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", output_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/infographic", response_model=ApiResponse)
async def generate_infographic(
    notebook_id: UUID,
    request: InfographicCreate,
    user: dict = Depends(get_current_user),
):
    """Generate an infographic from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    supabase = get_supabase_client()
    source_id_list = [str(s["id"]) for s in sources]

    insert_result = supabase.table("studio_outputs").insert({
        "notebook_id": str(notebook_id),
        "type": "infographic",
        "status": "processing",
        "source_ids": source_id_list,
        "custom_instructions": request.custom_instructions,
    }).execute()

    output_id = insert_result.data[0]["id"]

    try:
        # First, generate the infographic content plan
        result = await gemini_service.generate_infographic_plan(
            content=content[:50000],
            style=request.style,
            custom_instructions=request.custom_instructions,
            model_name=request.model,
            persona_instructions=persona_instructions,
        )

        infographic_data = parse_json_response(result["content"])

        # TODO: Generate actual image using Nano Banana API
        # For now, we store the plan and image prompt

        supabase.table("studio_outputs").update({
            "status": "completed",
            "title": infographic_data.get("title", "Infographic"),
            "content": infographic_data,
            "model_used": result["usage"].get("model_used"),
            "cost_usd": result["usage"].get("cost_usd"),
            "completed_at": "now()",
        }).eq("id", output_id).execute()

        return ApiResponse(
            data={"id": output_id, "content": infographic_data},
            usage=result["usage"],
        )
    except Exception as e:
        supabase.table("studio_outputs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", output_id).execute()
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from app.models.schemas import (
    ResearchCreate,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service

router = APIRouter(prefix="/notebooks/{notebook_id}/research", tags=["research"])


async def verify_notebook_access(notebook_id: UUID, user_id: str):
    """Verify user has access to the notebook."""
    supabase = get_supabase_client()
    result = (
        supabase.table("notebooks")
        .select("id")
        .eq("id", str(notebook_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return result.data


@router.post("", response_model=ApiResponse)
async def create_research(
    notebook_id: UUID,
    research: ResearchCreate,
    user: dict = Depends(get_current_user),
):
    """Start a deep research task."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Create research task record
    task_data = {
        "notebook_id": str(notebook_id),
        "query": research.query,
        "mode": research.mode or "fast",
        "status": "pending",
        "progress_message": "Initializing research...",
    }

    result = supabase.table("research_tasks").insert(task_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create research task")

    task_id = result.data[0]["id"]

    # Start processing (in production, this would be async with Deep Research)
    try:
        # Update status to processing
        supabase.table("research_tasks").update({
            "status": "processing",
            "progress_message": "Searching for sources...",
        }).eq("id", task_id).execute()

        # Simulate research phases
        supabase.table("research_tasks").update({
            "progress_message": "Analyzing sources...",
            "sources_found_count": 10,
        }).eq("id", task_id).execute()

        # Generate research report
        research_result = await gemini_service.generate_research_report(
            query=research.query,
            mode=research.mode or "fast",
        )

        # Update with results
        supabase.table("research_tasks").update({
            "status": "completed",
            "progress_message": "Research complete",
            "sources_analyzed_count": 10,
            "report_content": research_result["content"],
            "report_citations": research_result.get("citations", []),
            "cost_usd": research_result["usage"]["cost_usd"],
            "completed_at": "now()",
        }).eq("id", task_id).execute()

    except Exception as e:
        supabase.table("research_tasks").update({
            "status": "failed",
            "progress_message": str(e),
        }).eq("id", task_id).execute()

    # Get updated record
    result = supabase.table("research_tasks").select("*").eq("id", task_id).single().execute()

    return ApiResponse(data=result.data)


@router.get("", response_model=ApiResponse)
async def list_research(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all research tasks for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("research_tasks")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{task_id}", response_model=ApiResponse)
async def get_research(
    notebook_id: UUID,
    task_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get research task status and report."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("research_tasks")
        .select("*")
        .eq("id", str(task_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Research task not found")

    return ApiResponse(data=result.data)


@router.post("/{task_id}/add-to-notebook", response_model=ApiResponse)
async def add_research_to_notebook(
    notebook_id: UUID,
    task_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Add research results as a source to the notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get research task
    task = (
        supabase.table("research_tasks")
        .select("*")
        .eq("id", str(task_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not task.data:
        raise HTTPException(status_code=404, detail="Research task not found")

    if task.data["status"] != "completed":
        raise HTTPException(status_code=400, detail="Research task is not completed")

    # Create a text source from the research report
    source_data = {
        "notebook_id": str(notebook_id),
        "type": "text",
        "name": f"Research: {task.data['query'][:50]}...",
        "status": "ready",
        "metadata": {
            "content": task.data["report_content"],
            "research_task_id": str(task_id),
        },
        "source_guide": {
            "summary": f"Research report on: {task.data['query']}",
            "citations": task.data.get("report_citations", []),
        },
    }

    result = supabase.table("sources").insert(source_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create source")

    return ApiResponse(data=result.data[0])


@router.delete("/{task_id}", response_model=ApiResponse)
async def delete_research(
    notebook_id: UUID,
    task_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a research task."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get task first
    task = (
        supabase.table("research_tasks")
        .select("id")
        .eq("id", str(task_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not task.data:
        raise HTTPException(status_code=404, detail="Research task not found")

    # Delete record
    supabase.table("research_tasks").delete().eq("id", str(task_id)).execute()

    return ApiResponse(data={"deleted": True, "id": str(task_id)})

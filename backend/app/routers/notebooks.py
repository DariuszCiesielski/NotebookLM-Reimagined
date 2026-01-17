from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID

from app.models.schemas import (
    NotebookCreate,
    NotebookUpdate,
    NotebookResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.post("", response_model=ApiResponse)
async def create_notebook(
    notebook: NotebookCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new notebook."""
    supabase = get_supabase_client()

    # Create notebook record
    data = {
        "user_id": user["id"],
        "name": notebook.name,
        "description": notebook.description,
        "emoji": notebook.emoji,
        "settings": {},
    }

    result = supabase.table("notebooks").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create notebook")

    return ApiResponse(data=result.data[0])


@router.get("", response_model=ApiResponse)
async def list_notebooks(
    user: dict = Depends(get_current_user),
):
    """List all notebooks for the current user."""
    supabase = get_supabase_client()

    result = (
        supabase.table("notebooks")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{notebook_id}", response_model=ApiResponse)
async def get_notebook(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific notebook."""
    supabase = get_supabase_client()

    result = (
        supabase.table("notebooks")
        .select("*")
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data=result.data)


@router.patch("/{notebook_id}", response_model=ApiResponse)
async def update_notebook(
    notebook_id: UUID,
    notebook: NotebookUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a notebook."""
    supabase = get_supabase_client()

    # Build update data (only include non-None fields)
    update_data = {}
    if notebook.name is not None:
        update_data["name"] = notebook.name
    if notebook.description is not None:
        update_data["description"] = notebook.description
    if notebook.emoji is not None:
        update_data["emoji"] = notebook.emoji
    if notebook.settings is not None:
        update_data["settings"] = notebook.settings

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("notebooks")
        .update(update_data)
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data=result.data[0])


@router.delete("/{notebook_id}", response_model=ApiResponse)
async def delete_notebook(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a notebook and all its contents."""
    supabase = get_supabase_client()

    # Delete notebook (cascades to sources, sessions, etc.)
    result = (
        supabase.table("notebooks")
        .delete()
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data={"deleted": True, "id": str(notebook_id)})

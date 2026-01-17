from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID

from app.models.schemas import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    SaveResponseCreate,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/notebooks/{notebook_id}/notes", tags=["notes"])


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
async def create_note(
    notebook_id: UUID,
    note: NoteCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new note."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    note_data = {
        "notebook_id": str(notebook_id),
        "type": "written",
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
    }

    result = supabase.table("notes").insert(note_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create note")

    return ApiResponse(data=result.data[0])


@router.post("/save-response", response_model=ApiResponse)
async def save_response(
    notebook_id: UUID,
    request: SaveResponseCreate,
    user: dict = Depends(get_current_user),
):
    """Save a chat response as a note."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get the chat message
    message = (
        supabase.table("chat_messages")
        .select("*")
        .eq("id", str(request.message_id))
        .single()
        .execute()
    )

    if not message.data:
        raise HTTPException(status_code=404, detail="Message not found")

    # Create note from message
    note_data = {
        "notebook_id": str(notebook_id),
        "type": "saved_response",
        "title": f"Saved Response",
        "content": message.data["content"],
        "original_message_id": str(request.message_id),
    }

    result = supabase.table("notes").insert(note_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save response")

    return ApiResponse(data=result.data[0])


@router.get("", response_model=ApiResponse)
async def list_notes(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all notes in a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("notes")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("is_pinned", desc=True)
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{note_id}", response_model=ApiResponse)
async def get_note(
    notebook_id: UUID,
    note_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific note."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("notes")
        .select("*")
        .eq("id", str(note_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found")

    return ApiResponse(data=result.data)


@router.patch("/{note_id}", response_model=ApiResponse)
async def update_note(
    notebook_id: UUID,
    note_id: UUID,
    note: NoteUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a note."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    update_data = {}
    if note.title is not None:
        update_data["title"] = note.title
    if note.content is not None:
        update_data["content"] = note.content
    if note.tags is not None:
        update_data["tags"] = note.tags
    if note.is_pinned is not None:
        update_data["is_pinned"] = note.is_pinned

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("notes")
        .update(update_data)
        .eq("id", str(note_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found")

    return ApiResponse(data=result.data[0])


@router.delete("/{note_id}", response_model=ApiResponse)
async def delete_note(
    notebook_id: UUID,
    note_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a note."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("notes")
        .delete()
        .eq("id", str(note_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found")

    return ApiResponse(data={"deleted": True, "id": str(note_id)})

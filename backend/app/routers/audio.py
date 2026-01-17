from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID, uuid4
import json
from datetime import datetime

from app.models.schemas import (
    AudioCreate,
    AudioEstimate,
    AudioResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service

router = APIRouter(prefix="/notebooks/{notebook_id}/audio", tags=["audio"])

# Supabase storage URL for audio bucket
SUPABASE_URL = "https://acsxrlkevwjmvbavgogu.supabase.co"


def add_audio_url(audio_data: dict) -> dict:
    """Add audio_url to response if audio_file_path exists."""
    if audio_data and audio_data.get("audio_file_path"):
        audio_data["audio_url"] = f"{SUPABASE_URL}/storage/v1/object/public/audio/{audio_data['audio_file_path']}"
    return audio_data


def add_audio_urls(audio_list: list) -> list:
    """Add audio_url to each item in the list."""
    return [add_audio_url(item) for item in audio_list]


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


# Duration estimates by format (in seconds)
FORMAT_DURATION = {
    "deep_dive": (360, 900),  # 6-15 min
    "brief": (60, 180),  # 1-3 min
    "critique": (300, 600),  # 5-10 min
    "debate": (480, 900),  # 8-15 min
}


@router.post("/estimate", response_model=ApiResponse)
async def estimate_audio_cost(
    notebook_id: UUID,
    audio: AudioCreate,
    user: dict = Depends(get_current_user),
):
    """Get cost estimate for audio generation."""
    await verify_notebook_access(notebook_id, user["id"])

    min_dur, max_dur = FORMAT_DURATION.get(audio.format, (300, 600))
    avg_duration = (min_dur + max_dur) // 2

    # TTS costs approximately $0.0001 per character
    # Script is roughly 150 words/min, 5 chars/word
    estimated_chars = avg_duration * (150 / 60) * 5
    estimated_cost = estimated_chars * 0.0001

    # Add script generation cost
    estimated_cost += 0.10  # Approximate Gemini Pro cost

    estimate = {
        "estimated_duration_seconds": avg_duration,
        "estimated_cost_usd": round(estimated_cost, 4),
        "format": audio.format,
    }

    return ApiResponse(data=estimate)


@router.post("", response_model=ApiResponse)
async def create_audio(
    notebook_id: UUID,
    audio: AudioCreate,
    user: dict = Depends(get_current_user),
):
    """Start audio overview generation."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get source content
    content, sources = await get_sources_content(notebook_id, audio.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    # Create audio record
    audio_data = {
        "notebook_id": str(notebook_id),
        "format": audio.format,
        "status": "pending",
        "progress_percent": 0,
        "custom_instructions": audio.custom_instructions,
        "source_ids": [str(s["id"]) for s in sources],
    }

    result = supabase.table("audio_overviews").insert(audio_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create audio job")

    audio_id = result.data[0]["id"]

    # Start processing (in production, this would be async)
    try:
        print(f"[AUDIO] Starting audio generation for {audio_id}")
        # Update status to processing
        supabase.table("audio_overviews").update({
            "status": "processing",
            "progress_percent": 10,
        }).eq("id", audio_id).execute()

        # Generate script
        script_result = await gemini_service.generate_audio_script(
            content=content[:100000],
            format_type=audio.format,
            custom_instructions=audio.custom_instructions,
        )

        script = script_result["content"]

        # Update with script
        supabase.table("audio_overviews").update({
            "script": script,
            "progress_percent": 50,
        }).eq("id", audio_id).execute()

        # Generate TTS audio
        print(f"[AUDIO] Starting TTS generation for {audio_id}")
        supabase.table("audio_overviews").update({
            "progress_percent": 60,
        }).eq("id", audio_id).execute()

        tts_result = await gemini_service.generate_tts_audio(
            script=script,
            format_type=audio.format,
        )
        print(f"[AUDIO] TTS completed, audio size: {len(tts_result.get('audio_data', b''))} bytes")

        # Upload audio to Supabase Storage
        supabase.table("audio_overviews").update({
            "progress_percent": 80,
        }).eq("id", audio_id).execute()

        audio_filename = f"{notebook_id}/{audio_id}.wav"
        upload_result = supabase.storage.from_("audio").upload(
            audio_filename,
            tts_result["audio_data"],
            {"content-type": "audio/wav"}
        )

        # Get public URL for the audio file
        audio_url = supabase.storage.from_("audio").get_public_url(audio_filename)

        # Mark as complete with audio file
        supabase.table("audio_overviews").update({
            "status": "completed",
            "progress_percent": 100,
            "model_used": "gemini-2.5-pro",
            "cost_usd": script_result["usage"]["cost_usd"],
            "audio_file_path": audio_filename,
            "duration_seconds": int(tts_result["duration_seconds"]),
            "completed_at": "now()",
        }).eq("id", audio_id).execute()

    except Exception as e:
        import traceback
        print(f"[AUDIO] ERROR: {type(e).__name__}: {str(e)}")
        print(f"[AUDIO] Traceback: {traceback.format_exc()}")
        supabase.table("audio_overviews").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", audio_id).execute()

    # Get updated record
    result = supabase.table("audio_overviews").select("*").eq("id", audio_id).single().execute()

    return ApiResponse(data=add_audio_url(result.data))


@router.get("", response_model=ApiResponse)
async def list_audio(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all audio overviews for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("audio_overviews")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=add_audio_urls(result.data or []))


@router.get("/{audio_id}", response_model=ApiResponse)
async def get_audio(
    notebook_id: UUID,
    audio_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get audio overview status."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("audio_overviews")
        .select("*")
        .eq("id", str(audio_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Audio not found")

    return ApiResponse(data=add_audio_url(result.data))


@router.get("/{audio_id}/download", response_model=ApiResponse)
async def get_audio_download(
    notebook_id: UUID,
    audio_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get signed download URL for audio file."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("audio_overviews")
        .select("audio_file_path")
        .eq("id", str(audio_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data or not result.data.get("audio_file_path"):
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Generate signed URL
    signed_url = supabase.storage.from_("audio").create_signed_url(
        result.data["audio_file_path"],
        3600,  # 1 hour expiry
    )

    return ApiResponse(data={"download_url": signed_url.get("signedURL")})


@router.delete("/{audio_id}", response_model=ApiResponse)
async def delete_audio(
    notebook_id: UUID,
    audio_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete an audio overview."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get audio first
    audio = (
        supabase.table("audio_overviews")
        .select("*")
        .eq("id", str(audio_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not audio.data:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Delete from storage if exists
    if audio.data.get("audio_file_path"):
        try:
            supabase.storage.from_("audio").remove([audio.data["audio_file_path"]])
        except:
            pass

    # Delete record
    supabase.table("audio_overviews").delete().eq("id", str(audio_id)).execute()

    return ApiResponse(data={"deleted": True, "id": str(audio_id)})

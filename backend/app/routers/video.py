from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from app.models.schemas import (
    VideoCreate,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service
from app.services.atlascloud_video import atlascloud_video_service

router = APIRouter(prefix="/notebooks/{notebook_id}/video", tags=["video"])


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


# Style settings for video generation
STYLE_SETTINGS = {
    "documentary": {
        "name": "Documentary",
        "description": "Cinematic documentary style with narration",
        "duration": 10,  # seconds for Wan 2.5
        "prompt_style": "cinematic documentary footage, professional cinematography, dramatic lighting, smooth camera movements, 4K quality",
        "negative_prompt": "text, watermark, logo, low quality, blurry, distorted",
    },
    "explainer": {
        "name": "Explainer",
        "description": "Educational explainer with graphics",
        "duration": 5,
        "prompt_style": "educational visualization, clean modern graphics, infographic style, smooth animations, professional presentation",
        "negative_prompt": "text, watermark, logo, cluttered, messy, low quality",
    },
    "presentation": {
        "name": "Presentation",
        "description": "Business presentation style",
        "duration": 5,
        "prompt_style": "professional business presentation, clean corporate aesthetic, modern office environment, polished visuals",
        "negative_prompt": "text, watermark, logo, unprofessional, casual, low quality",
    },
}

# Cost per second for Wan 2.5
VIDEO_COST_PER_SECOND = 0.02


@router.post("/estimate", response_model=ApiResponse)
async def estimate_video_cost(
    notebook_id: UUID,
    video: VideoCreate,
    user: dict = Depends(get_current_user),
):
    """Get cost estimate for video generation."""
    await verify_notebook_access(notebook_id, user["id"])

    style_settings = STYLE_SETTINGS.get(video.style, STYLE_SETTINGS["explainer"])
    duration = style_settings["duration"]

    # Wan 2.5 costs approximately $0.02 per second + Gemini prompt generation
    video_cost = duration * VIDEO_COST_PER_SECOND
    prompt_cost = 0.01  # Approximate Gemini cost for prompt generation
    estimated_cost = video_cost + prompt_cost

    estimate = {
        "estimated_duration_seconds": duration,
        "estimated_cost_usd": round(estimated_cost, 2),
        "style": video.style,
        "style_name": style_settings["name"],
        "model": "alibaba/wan-2.5/text-to-video-fast",
    }

    return ApiResponse(data=estimate)


@router.post("", response_model=ApiResponse)
async def create_video(
    notebook_id: UUID,
    video: VideoCreate,
    user: dict = Depends(get_current_user),
):
    """Start video overview generation using AtlasCloud Wan 2.5."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get source content
    content, sources = await get_sources_content(notebook_id, video.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    style_settings = STYLE_SETTINGS.get(video.style, STYLE_SETTINGS["explainer"])
    duration = style_settings["duration"]

    # Create video record
    video_data = {
        "notebook_id": str(notebook_id),
        "style": video.style,
        "status": "pending",
        "progress_percent": 0,
        "source_ids": [str(s["id"]) for s in sources],
    }

    result = supabase.table("video_overviews").insert(video_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create video job")

    video_id = result.data[0]["id"]
    total_cost = 0.0

    try:
        # Update status to processing
        supabase.table("video_overviews").update({
            "status": "processing",
            "progress_percent": 5,
        }).eq("id", video_id).execute()

        # Step 1: Generate video prompt from content using Gemini (cheaper model)
        prompt_gen_result = await gemini_service.generate_content(
            prompt=f"""Based on the following content, create a single concise video generation prompt (2-3 sentences max) that describes a compelling visual scene to represent the main theme or concept.

The video should be {style_settings['name'].lower()} style: {style_settings['prompt_style']}.

Content:
{content[:10000]}

Generate ONLY the video prompt, nothing else. Make it vivid and visually descriptive.""",
            model_name="gemini-2.0-flash",
            temperature=0.7,
        )

        video_prompt = prompt_gen_result["content"].strip()
        total_cost += prompt_gen_result["usage"]["cost_usd"]

        # Update with generated prompt
        supabase.table("video_overviews").update({
            "script": f"Video Prompt: {video_prompt}\n\nStyle: {style_settings['name']}\nDuration: {duration} seconds",
            "progress_percent": 15,
        }).eq("id", video_id).execute()

        # Step 2: Generate video using AtlasCloud Wan 2.5
        async def update_progress(progress):
            # Map the 0-90 progress from AtlasCloud to 15-95 for our UI
            ui_progress = 15 + int(progress * 0.8)
            supabase.table("video_overviews").update({
                "progress_percent": ui_progress,
            }).eq("id", video_id).execute()

        video_result = await atlascloud_video_service.generate_and_wait(
            prompt=video_prompt,
            duration=duration,
            size="1280*720",
            negative_prompt=style_settings.get("negative_prompt"),
            enable_prompt_expansion=True,
            progress_callback=update_progress,
        )

        video_url = video_result["video_url"]
        total_cost += video_result["cost_usd"]

        # Update with completed video
        supabase.table("video_overviews").update({
            "status": "completed",
            "progress_percent": 100,
            "video_file_path": video_url,  # Store the AtlasCloud URL directly
            "duration_seconds": duration,
            "model_used": "alibaba/wan-2.5/text-to-video-fast",
            "cost_usd": total_cost,
            "completed_at": "now()",
        }).eq("id", video_id).execute()

    except Exception as e:
        supabase.table("video_overviews").update({
            "status": "failed",
            "error_message": str(e),
            "cost_usd": total_cost,
        }).eq("id", video_id).execute()

    # Get updated record
    result = supabase.table("video_overviews").select("*").eq("id", video_id).single().execute()

    return ApiResponse(data=result.data)


@router.get("", response_model=ApiResponse)
async def list_videos(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all video overviews for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{video_id}", response_model=ApiResponse)
async def get_video(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get video overview status."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("*")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found")

    return ApiResponse(data=result.data)


@router.get("/{video_id}/download", response_model=ApiResponse)
async def get_video_download(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get signed download URL for video file."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("video_file_path")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data or not result.data.get("video_file_path"):
        raise HTTPException(status_code=404, detail="Video file not found")

    # Generate signed URL
    signed_url = supabase.storage.from_("video").create_signed_url(
        result.data["video_file_path"],
        3600,  # 1 hour expiry
    )

    return ApiResponse(data={"download_url": signed_url.get("signedURL")})


@router.delete("/{video_id}", response_model=ApiResponse)
async def delete_video(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a video overview."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get video first
    video = (
        supabase.table("video_overviews")
        .select("*")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not video.data:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete from storage if exists
    if video.data.get("video_file_path"):
        try:
            supabase.storage.from_("video").remove([video.data["video_file_path"]])
        except:
            pass

    if video.data.get("thumbnail_path"):
        try:
            supabase.storage.from_("video").remove([video.data["thumbnail_path"]])
        except:
            pass

    # Delete record
    supabase.table("video_overviews").delete().eq("id", str(video_id)).execute()

    return ApiResponse(data={"deleted": True, "id": str(video_id)})

"""
Export router for downloading complete notebook data.
Supports JSON and ZIP export formats.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
import json
import zipfile
import io
from datetime import datetime

from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/notebooks/{notebook_id}/export", tags=["export"])


async def get_notebook_data(
    notebook_id: str,
    user_id: str,
    include_sources: bool = True,
    include_chats: bool = True,
    include_notes: bool = True,
    include_generated: bool = True,
) -> dict:
    """Gather all notebook data for export."""
    supabase = get_supabase_client()

    # Verify notebook access and get metadata
    notebook_result = (
        supabase.table("notebooks")
        .select("*")
        .eq("id", notebook_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not notebook_result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    notebook = notebook_result.data
    export_data = {
        "notebook": {
            "id": notebook["id"],
            "name": notebook["name"],
            "description": notebook.get("description"),
            "emoji": notebook.get("emoji"),
            "settings": notebook.get("settings", {}),
            "created_at": notebook["created_at"],
        },
        "exported_at": datetime.utcnow().isoformat(),
        "export_version": "1.0",
    }

    # Sources
    if include_sources:
        sources_result = (
            supabase.table("sources")
            .select("*")
            .eq("notebook_id", notebook_id)
            .order("created_at", desc=False)
            .execute()
        )
        export_data["sources"] = sources_result.data or []

    # Chat sessions and messages
    if include_chats:
        sessions_result = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("notebook_id", notebook_id)
            .order("created_at", desc=False)
            .execute()
        )
        sessions = sessions_result.data or []

        for session in sessions:
            messages_result = (
                supabase.table("chat_messages")
                .select("*")
                .eq("session_id", session["id"])
                .order("created_at", desc=False)
                .execute()
            )
            session["messages"] = messages_result.data or []

        export_data["chat_sessions"] = sessions

    # Notes
    if include_notes:
        notes_result = (
            supabase.table("notes")
            .select("*")
            .eq("notebook_id", notebook_id)
            .order("created_at", desc=False)
            .execute()
        )
        export_data["notes"] = notes_result.data or []

    # Generated content
    if include_generated:
        # Audio overviews
        audio_result = (
            supabase.table("audio_overviews")
            .select("*")
            .eq("notebook_id", notebook_id)
            .execute()
        )
        export_data["audio_overviews"] = audio_result.data or []

        # Video overviews
        video_result = (
            supabase.table("video_overviews")
            .select("*")
            .eq("notebook_id", notebook_id)
            .execute()
        )
        export_data["video_overviews"] = video_result.data or []

        # Study materials
        study_result = (
            supabase.table("study_materials")
            .select("*")
            .eq("notebook_id", notebook_id)
            .execute()
        )
        export_data["study_materials"] = study_result.data or []

        # Studio outputs
        studio_result = (
            supabase.table("studio_outputs")
            .select("*")
            .eq("notebook_id", notebook_id)
            .execute()
        )
        export_data["studio_outputs"] = studio_result.data or []

        # Research tasks
        research_result = (
            supabase.table("research_tasks")
            .select("*")
            .eq("notebook_id", notebook_id)
            .execute()
        )
        export_data["research_tasks"] = research_result.data or []

    return export_data


@router.get("/json")
async def export_notebook_json(
    notebook_id: UUID,
    include_sources: bool = True,
    include_chats: bool = True,
    include_notes: bool = True,
    include_generated: bool = True,
    user: dict = Depends(get_current_user),
):
    """Export notebook data as JSON."""
    export_data = await get_notebook_data(
        str(notebook_id),
        user["id"],
        include_sources,
        include_chats,
        include_notes,
        include_generated,
    )

    return export_data


@router.get("/zip")
async def export_notebook_zip(
    notebook_id: UUID,
    include_sources: bool = True,
    include_chats: bool = True,
    include_notes: bool = True,
    include_generated: bool = True,
    user: dict = Depends(get_current_user),
):
    """Export notebook as ZIP with all files."""
    supabase = get_supabase_client()

    export_data = await get_notebook_data(
        str(notebook_id),
        user["id"],
        include_sources,
        include_chats,
        include_notes,
        include_generated,
    )

    notebook_name = export_data["notebook"]["name"]
    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in notebook_name)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    zip_name = f"notebook-export-{safe_name}-{date_str}"

    # Create ZIP in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Notebook metadata
        zf.writestr(
            f"{zip_name}/notebook.json",
            json.dumps(export_data["notebook"], indent=2, default=str)
        )

        # README
        readme_content = f"""# {notebook_name} Export

Exported from NotebookLM Reimagined on {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}

## Contents

- `notebook.json` - Notebook metadata (name, description, settings)
- `sources/` - Source documents and metadata
- `chats/` - Chat sessions and messages
- `notes/` - User notes
- `generated/` - AI-generated content (audio, video, study materials, etc.)

## Re-importing

This export can be used as a backup. To re-import, use the NotebookLM Reimagined import feature.
"""
        zf.writestr(f"{zip_name}/README.md", readme_content)

        # Sources
        if include_sources and export_data.get("sources"):
            sources_index = []
            for source in export_data["sources"]:
                source_info = {
                    "id": source["id"],
                    "name": source["name"],
                    "type": source["type"],
                    "status": source["status"],
                    "created_at": source["created_at"],
                    "metadata": source.get("metadata"),
                    "source_guide": source.get("source_guide"),
                }
                sources_index.append(source_info)

                # Try to download actual file from storage
                if source.get("file_path"):
                    try:
                        file_data = supabase.storage.from_("sources").download(source["file_path"])
                        if file_data:
                            filename = source.get("original_filename") or source["name"]
                            zf.writestr(f"{zip_name}/sources/files/{filename}", file_data)
                            source_info["exported_file"] = f"files/{filename}"
                    except Exception as e:
                        source_info["export_error"] = str(e)

                # For text sources, include content
                if source["type"] == "text" and source.get("metadata"):
                    metadata = source["metadata"] or {}
                    if content := metadata.get("content"):
                        filename = f"{source['id']}.txt"
                        zf.writestr(f"{zip_name}/sources/text/{filename}", content)
                        source_info["exported_file"] = f"text/{filename}"

            zf.writestr(
                f"{zip_name}/sources/index.json",
                json.dumps(sources_index, indent=2, default=str)
            )

        # Chats
        if include_chats and export_data.get("chat_sessions"):
            sessions_index = []
            for session in export_data["chat_sessions"]:
                session_info = {
                    "id": session["id"],
                    "title": session.get("title"),
                    "created_at": session["created_at"],
                    "message_count": len(session.get("messages", [])),
                }
                sessions_index.append(session_info)

                # Individual session file
                zf.writestr(
                    f"{zip_name}/chats/session-{session['id']}.json",
                    json.dumps(session, indent=2, default=str)
                )

            zf.writestr(
                f"{zip_name}/chats/index.json",
                json.dumps(sessions_index, indent=2, default=str)
            )

        # Notes
        if include_notes and export_data.get("notes"):
            zf.writestr(
                f"{zip_name}/notes/index.json",
                json.dumps(export_data["notes"], indent=2, default=str)
            )

        # Generated content
        if include_generated:
            generated_index = {
                "audio_overviews": [],
                "video_overviews": [],
                "study_materials": [],
                "studio_outputs": [],
                "research_tasks": [],
            }

            # Audio
            for audio in export_data.get("audio_overviews", []):
                audio_info = {
                    "id": audio["id"],
                    "format": audio.get("format"),
                    "status": audio.get("status"),
                    "created_at": audio.get("created_at"),
                }
                generated_index["audio_overviews"].append(audio_info)

                # Save script
                if audio.get("script"):
                    zf.writestr(
                        f"{zip_name}/generated/audio/{audio['id']}_script.json",
                        json.dumps(audio["script"], indent=2, default=str)
                    )

                # Try to download audio file
                if audio.get("audio_file_path"):
                    try:
                        audio_data = supabase.storage.from_("audio").download(audio["audio_file_path"])
                        if audio_data:
                            zf.writestr(f"{zip_name}/generated/audio/{audio['id']}.mp3", audio_data)
                            audio_info["exported_file"] = f"{audio['id']}.mp3"
                    except Exception:
                        pass

            # Video
            for video in export_data.get("video_overviews", []):
                video_info = {
                    "id": video["id"],
                    "style": video.get("style"),
                    "status": video.get("status"),
                    "created_at": video.get("created_at"),
                }
                generated_index["video_overviews"].append(video_info)

                if video.get("script"):
                    zf.writestr(
                        f"{zip_name}/generated/video/{video['id']}_script.json",
                        json.dumps(video["script"], indent=2, default=str)
                    )

            # Study materials
            for material in export_data.get("study_materials", []):
                material_info = {
                    "id": material["id"],
                    "type": material.get("type"),
                    "created_at": material.get("created_at"),
                }
                generated_index["study_materials"].append(material_info)

                zf.writestr(
                    f"{zip_name}/generated/study-materials/{material['type']}_{material['id']}.json",
                    json.dumps(material, indent=2, default=str)
                )

            # Studio outputs
            for output in export_data.get("studio_outputs", []):
                output_info = {
                    "id": output["id"],
                    "type": output.get("type"),
                    "title": output.get("title"),
                    "created_at": output.get("created_at"),
                }
                generated_index["studio_outputs"].append(output_info)

                zf.writestr(
                    f"{zip_name}/generated/studio/{output['type']}_{output['id']}.json",
                    json.dumps(output, indent=2, default=str)
                )

            # Research tasks
            for research in export_data.get("research_tasks", []):
                research_info = {
                    "id": research["id"],
                    "query": research.get("query"),
                    "status": research.get("status"),
                    "created_at": research.get("created_at"),
                }
                generated_index["research_tasks"].append(research_info)

                zf.writestr(
                    f"{zip_name}/generated/research/{research['id']}.json",
                    json.dumps(research, indent=2, default=str)
                )

            zf.writestr(
                f"{zip_name}/generated/index.json",
                json.dumps(generated_index, indent=2, default=str)
            )

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_name}.zip"',
        },
    )

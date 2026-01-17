from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID
import json

from app.models.schemas import (
    FlashcardCreate,
    FlashcardsResponse,
    QuizCreate,
    QuizResponse,
    StudyGuideCreate,
    StudyGuideResponse,
    FAQCreate,
    FAQResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service
from app.services.persona_utils import build_persona_instructions

router = APIRouter(prefix="/notebooks/{notebook_id}", tags=["study"])


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
    # Remove markdown code blocks if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {"error": "Failed to parse response", "raw": text}


@router.post("/flashcards", response_model=ApiResponse)
async def generate_flashcards(
    notebook_id: UUID,
    request: FlashcardCreate,
    user: dict = Depends(get_current_user),
):
    """Generate flashcards from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    result = await gemini_service.generate_flashcards(
        content=content[:50000],
        count=request.count,
        model_name=request.model,
        persona_instructions=persona_instructions,
    )

    flashcards = parse_json_response(result["content"])

    return ApiResponse(
        data={"flashcards": flashcards if isinstance(flashcards, list) else []},
        usage=result["usage"],
    )


@router.post("/quiz", response_model=ApiResponse)
async def generate_quiz(
    notebook_id: UUID,
    request: QuizCreate,
    user: dict = Depends(get_current_user),
):
    """Generate a quiz from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    result = await gemini_service.generate_quiz(
        content=content[:50000],
        question_count=request.question_count,
        model_name=request.model,
        persona_instructions=persona_instructions,
    )

    questions = parse_json_response(result["content"])

    return ApiResponse(
        data={"questions": questions if isinstance(questions, list) else []},
        usage=result["usage"],
    )


@router.post("/study-guide", response_model=ApiResponse)
async def generate_study_guide(
    notebook_id: UUID,
    request: StudyGuideCreate,
    user: dict = Depends(get_current_user),
):
    """Generate a study guide from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    result = await gemini_service.generate_study_guide(
        content=content[:50000],
        model_name=request.model,
        persona_instructions=persona_instructions,
    )

    guide = parse_json_response(result["content"])

    return ApiResponse(
        data=guide,
        usage=result["usage"],
    )


@router.post("/faq", response_model=ApiResponse)
async def generate_faq(
    notebook_id: UUID,
    request: FAQCreate,
    user: dict = Depends(get_current_user),
):
    """Generate FAQ from notebook sources."""
    notebook = await verify_notebook_access(notebook_id, user["id"])

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    content, sources = await get_sources_content(notebook_id, request.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    result = await gemini_service.generate_faq(
        content=content[:50000],
        count=request.count,
        model_name=request.model,
        persona_instructions=persona_instructions,
    )

    faqs = parse_json_response(result["content"])

    return ApiResponse(
        data={"faqs": faqs if isinstance(faqs, list) else []},
        usage=result["usage"],
    )

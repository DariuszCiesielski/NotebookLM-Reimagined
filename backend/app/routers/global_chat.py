from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from app.models.schemas import (
    GlobalChatMessage,
    GlobalCitation,
    GlobalChatResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service

router = APIRouter(prefix="/chat/global", tags=["global-chat"])


async def get_user_notebooks(user_id: str, notebook_ids: Optional[List[UUID]] = None):
    """Get notebooks accessible by the user, optionally filtered by IDs."""
    supabase = get_supabase_client()

    query = supabase.table("notebooks").select("id, name, emoji").eq("user_id", user_id)

    if notebook_ids:
        query = query.in_("id", [str(nid) for nid in notebook_ids])

    result = query.execute()
    return result.data or []


async def get_sources_from_notebooks(
    notebook_ids: List[str],
    max_per_notebook: int = 10
) -> tuple[str, list, list]:
    """Get sources from multiple notebooks for RAG context.

    Returns:
        Tuple of (context_string, sources_list, notebooks_with_sources)
    """
    supabase = get_supabase_client()

    all_sources = []
    notebooks_info = []
    context_parts = []

    for notebook_id in notebook_ids:
        # Get notebook name
        notebook_result = (
            supabase.table("notebooks")
            .select("id, name, emoji")
            .eq("id", notebook_id)
            .single()
            .execute()
        )

        if not notebook_result.data:
            continue

        notebook = notebook_result.data

        # Get sources for this notebook
        sources_result = (
            supabase.table("sources")
            .select("*")
            .eq("notebook_id", notebook_id)
            .eq("status", "ready")
            .limit(max_per_notebook)
            .execute()
        )

        sources = sources_result.data or []

        if sources:
            notebooks_info.append({
                "id": notebook["id"],
                "name": notebook["name"],
                "emoji": notebook.get("emoji", "📓"),
                "source_count": len(sources)
            })

            for source in sources:
                # Add notebook context to source
                source["_notebook_id"] = notebook["id"]
                source["_notebook_name"] = notebook["name"]
                all_sources.append(source)

                # Get content
                source_guide = source.get("source_guide") or {}
                metadata = source.get("metadata") or {}

                if source["type"] == "text" and metadata.get("content"):
                    content = metadata["content"]
                elif source_guide.get("summary"):
                    content = source_guide["summary"]
                else:
                    content = f"[Source: {source['name']}]"

                context_parts.append(
                    f"--- Notebook: {notebook['name']} | Source: {source['name']} ---\n{content}\n"
                )

    return "\n".join(context_parts), all_sources, notebooks_info


@router.get("/notebooks", response_model=ApiResponse)
async def list_available_notebooks(
    user: dict = Depends(get_current_user),
):
    """List all notebooks available for global chat queries.

    Use this to get notebook IDs before making a global chat query.
    """
    notebooks = await get_user_notebooks(user["id"])

    return ApiResponse(data=notebooks)


@router.post("", response_model=ApiResponse)
async def global_chat(
    chat: GlobalChatMessage,
    user: dict = Depends(get_current_user),
):
    """Query across multiple notebooks at once.

    This endpoint allows you to ask questions that search across all your notebooks
    (or a specific subset) and returns answers with citations that include notebook
    attribution.

    **Use cases:**
    - Find information across your entire knowledge base
    - Compare information from different notebooks
    - Search for a topic without knowing which notebook contains it

    **Limits:**
    - max_sources_per_notebook: Controls how many sources per notebook (default: 10, max: 50)
    - Total context is capped at 50 sources across all notebooks
    """
    # Get notebooks to query
    notebooks = await get_user_notebooks(user["id"], chat.notebook_ids)

    if not notebooks:
        raise HTTPException(
            status_code=404,
            detail="No notebooks found. Create a notebook and add sources first."
        )

    notebook_ids = [n["id"] for n in notebooks]

    # Get sources from all notebooks
    context, sources, notebooks_info = await get_sources_from_notebooks(
        notebook_ids,
        chat.max_sources_per_notebook
    )

    if not sources:
        raise HTTPException(
            status_code=400,
            detail="No sources found in the selected notebooks. Add sources to your notebooks first."
        )

    # Build source names with notebook attribution for the model
    source_names = [
        f"[{s['_notebook_name']}] {s['name']}"
        for s in sources
    ]

    # Generate response with context
    result = await gemini_service.generate_with_context(
        message=chat.message,
        context=context,
        model_name=chat.model,
        source_names=source_names,
    )

    # Parse citations from response
    content = result["content"]
    citations = []
    for i, source in enumerate(sources, 1):
        if f"[{i}]" in content:
            source_guide = source.get("source_guide") or {}
            citations.append({
                "number": i,
                "notebook_id": source["_notebook_id"],
                "notebook_name": source["_notebook_name"],
                "source_id": source["id"],
                "source_name": source["name"],
                "text": source_guide.get("summary", "")[:200] if source_guide.get("summary") else "",
                "confidence": 0.9,
            })

    # Generate suggested questions
    suggested_questions = []
    try:
        notebook_names = ", ".join([n["name"] for n in notebooks_info[:5]])
        suggest_result = await gemini_service.generate_content(
            prompt=f"""Based on this cross-notebook query, suggest 3 follow-up questions.

Notebooks queried: {notebook_names}
User asked: {chat.message}
Response excerpt: {content[:500]}

Return only the questions, one per line.""",
            model_name="gemini-2.0-flash",
        )
        suggested_questions = [
            q.strip() for q in suggest_result["content"].strip().split("\n")
            if q.strip()
        ][:3]
    except:
        pass

    response_data = {
        "content": content,
        "citations": citations,
        "notebooks_queried": notebooks_info,
        "suggested_questions": suggested_questions,
    }

    return ApiResponse(data=response_data, usage=result["usage"])

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from uuid import UUID, uuid4
import json

from app.models.schemas import (
    ChatMessage,
    ChatResponse,
    ChatSessionResponse,
    Citation,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service
from app.services.persona_utils import build_persona_instructions
from app.services.rag import rag_service

router = APIRouter(prefix="/notebooks/{notebook_id}/chat", tags=["chat"])


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
    """Get content from sources for RAG context (legacy - used as fallback)."""
    supabase = get_supabase_client()

    query = supabase.table("sources").select("*").eq("notebook_id", str(notebook_id)).eq("status", "ready")

    if source_ids:
        query = query.in_("id", [str(sid) for sid in source_ids])

    result = query.execute()
    sources = result.data or []

    context_parts = []
    source_names = []

    for source in sources:
        source_names.append(source["name"])

        # Get content based on source type
        source_guide = source.get("source_guide") or {}
        metadata = source.get("metadata") or {}

        if source["type"] == "text" and metadata.get("content"):
            content = metadata["content"]
        elif source_guide.get("summary"):
            content = source_guide["summary"]
        else:
            content = f"[Source: {source['name']}]"

        context_parts.append(f"--- Source: {source['name']} ---\n{content}\n")

    return "\n".join(context_parts), sources, source_names


async def get_rag_context(notebook_id: UUID, query: str, source_ids: Optional[List[UUID]] = None, match_count: int = 10):
    """
    Get context using RAG vector search.
    Returns the most relevant chunks for the given query.
    """
    supabase = get_supabase_client()
    
    # Use RAG service to find relevant chunks
    try:
        chunks = await rag_service.search(
            query=query,
            notebook_id=str(notebook_id),
            supabase_client=supabase,
            source_ids=[str(sid) for sid in source_ids] if source_ids else None,
            match_count=match_count
        )
    except Exception as e:
        # Fallback to legacy method if RAG search fails
        print(f"RAG search failed, using fallback: {e}")
        return await get_sources_content(notebook_id, source_ids)
    
    if not chunks:
        # No chunks found, try fallback
        return await get_sources_content(notebook_id, source_ids)
    
    # Get source details for citations
    source_ids_from_chunks = list(set(c["source_id"] for c in chunks))
    sources_result = supabase.table("sources").select("*").in_("id", source_ids_from_chunks).execute()
    sources = {s["id"]: s for s in (sources_result.data or [])}
    
    # Build context from chunks
    context_parts = []
    source_names = []
    seen_sources = set()
    
    for i, chunk in enumerate(chunks, 1):
        source = sources.get(chunk["source_id"], {})
        source_name = source.get("name", "Unknown")
        
        if source_name not in seen_sources:
            source_names.append(source_name)
            seen_sources.add(source_name)
        
        similarity = chunk.get("similarity", 0)
        context_parts.append(
            f"[{i}] Source: {source_name} (relevance: {similarity:.2f})\n{chunk['content']}\n"
        )
    
    sources_list = [sources.get(sid, {"id": sid, "name": "Unknown"}) for sid in source_ids_from_chunks]
    
    return "\n\n".join(context_parts), sources_list, source_names


@router.post("", response_model=ApiResponse)
async def send_message(
    notebook_id: UUID,
    chat: ChatMessage,
    user: dict = Depends(get_current_user),
):
    """Send a chat message and get a response."""
    notebook = await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get persona instructions from notebook settings
    settings = notebook.get("settings") or {}
    persona_instructions = build_persona_instructions(settings)

    # Get or create session
    session_id = chat.session_id
    if not session_id:
        session_result = supabase.table("chat_sessions").insert({
            "notebook_id": str(notebook_id),
            "title": chat.message[:50],
        }).execute()
        session_id = session_result.data[0]["id"]

    # Get source context using RAG vector search
    context, sources, source_names = await get_rag_context(notebook_id, chat.message, chat.source_ids)

    # Save user message
    user_msg = supabase.table("chat_messages").insert({
        "session_id": str(session_id),
        "role": "user",
        "content": chat.message,
        "source_ids_used": [str(sid) for sid in (chat.source_ids or [])],
    }).execute()

    # Generate response with context (include persona instructions)
    if context:
        result = await gemini_service.generate_with_context(
            message=chat.message,
            context=context,
            model_name=chat.model,
            source_names=source_names,
            persona_instructions=persona_instructions,
        )
    else:
        result = await gemini_service.generate_content(
            prompt=chat.message,
            model_name=chat.model,
            system_instruction=persona_instructions if persona_instructions else None,
        )

    # Parse citations from response (simple bracket notation)
    content = result["content"]
    citations = []
    for i, source in enumerate(sources, 1):
        if f"[{i}]" in content:
            sg = source.get("source_guide") or {}
            citations.append({
                "number": i,
                "source_id": source["id"],
                "source_name": source["name"],
                "text": sg.get("summary", "")[:200] if sg.get("summary") else "",
                "confidence": 0.9,
            })

    # Generate suggested questions
    suggested_questions = []
    if sources:
        try:
            suggest_result = await gemini_service.generate_content(
                prompt=f"Based on this conversation about the sources, suggest 3 follow-up questions the user might want to ask. Return only the questions, one per line.\n\nUser asked: {chat.message}\n\nResponse: {content[:500]}",
                model_name="gemini-2.0-flash",
            )
            suggested_questions = [q.strip() for q in suggest_result["content"].strip().split("\n") if q.strip()][:3]
        except:
            pass

    # Save assistant message
    assistant_msg = supabase.table("chat_messages").insert({
        "session_id": str(session_id),
        "role": "assistant",
        "content": content,
        "citations": citations,
        "source_ids_used": [str(s["id"]) for s in sources],
        "model_used": chat.model,
        "input_tokens": result["usage"]["input_tokens"],
        "output_tokens": result["usage"]["output_tokens"],
        "cost_usd": result["usage"]["cost_usd"],
    }).execute()

    response_data = {
        "message_id": assistant_msg.data[0]["id"],
        "session_id": session_id,
        "content": content,
        "citations": citations,
        "suggested_questions": suggested_questions,
    }

    return ApiResponse(data=response_data, usage=result["usage"])


@router.get("/sessions", response_model=ApiResponse)
async def list_sessions(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all chat sessions for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("chat_sessions")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("updated_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/sessions/{session_id}", response_model=ApiResponse)
async def get_session(
    notebook_id: UUID,
    session_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a chat session with all messages."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    session = (
        supabase.table("chat_sessions")
        .select("*")
        .eq("id", str(session_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        supabase.table("chat_messages")
        .select("*")
        .eq("session_id", str(session_id))
        .order("created_at", desc=False)
        .execute()
    )

    return ApiResponse(data={
        "session": session.data,
        "messages": messages.data,
    })


@router.delete("/sessions/{session_id}", response_model=ApiResponse)
async def delete_session(
    notebook_id: UUID,
    session_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a chat session."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("chat_sessions")
        .delete()
        .eq("id", str(session_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return ApiResponse(data={"deleted": True, "id": str(session_id)})


@router.patch("/sessions/{session_id}", response_model=ApiResponse)
async def rename_session(
    notebook_id: UUID,
    session_id: UUID,
    title: str,
    user: dict = Depends(get_current_user),
):
    """Rename a chat session."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("chat_sessions")
        .update({"title": title})
        .eq("id", str(session_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return ApiResponse(data=result.data[0])

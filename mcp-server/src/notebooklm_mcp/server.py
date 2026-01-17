"""
NotebookLM Reimagined MCP Server

Exposes research intelligence tools for LLMs via Model Context Protocol.
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize MCP server
server = Server("notebooklm-mcp")

# ============================================================================
# Configuration & Clients
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

_supabase_client = None
_gemini_configured = False


def get_supabase():
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def configure_gemini():
    """Configure Gemini API."""
    global _gemini_configured
    if not _gemini_configured:
        if not GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY must be set")
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        _gemini_configured = True


# Model pricing (per 1M tokens)
MODEL_PRICING = {
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD."""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["gemini-2.0-flash"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


async def generate_content(
    prompt: str,
    model_name: str = "gemini-2.0-flash",
    system_instruction: Optional[str] = None,
    temperature: float = 0.7,
) -> Dict[str, Any]:
    """Generate content using Gemini."""
    configure_gemini()
    import google.generativeai as genai

    generation_config = genai.GenerationConfig(temperature=temperature)

    if system_instruction:
        model = genai.GenerativeModel(model_name, system_instruction=system_instruction)
    else:
        model = genai.GenerativeModel(model_name)

    response = model.generate_content(prompt, generation_config=generation_config)

    input_tokens = response.usage_metadata.prompt_token_count
    output_tokens = response.usage_metadata.candidates_token_count
    cost = calculate_cost(model_name, input_tokens, output_tokens)

    return {
        "content": response.text,
        "usage": {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "model_used": model_name,
        },
    }


# ============================================================================
# Tool Definitions
# ============================================================================

TOOLS = [
    # --- Notebooks ---
    Tool(
        name="list_notebooks",
        description="List all notebooks for a user. Returns notebook IDs, names, descriptions, and source counts.",
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "The user ID to list notebooks for"
                }
            },
            "required": ["user_id"]
        }
    ),
    Tool(
        name="create_notebook",
        description="Create a new notebook for organizing research sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "The user ID"},
                "name": {"type": "string", "description": "Notebook name"},
                "description": {"type": "string", "description": "Optional description"},
                "emoji": {"type": "string", "description": "Optional emoji icon"}
            },
            "required": ["user_id", "name"]
        }
    ),
    Tool(
        name="get_notebook",
        description="Get details of a specific notebook including its sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"}
            },
            "required": ["notebook_id"]
        }
    ),
    Tool(
        name="delete_notebook",
        description="Delete a notebook and all its contents (sources, chats, notes, etc.)",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID to delete"}
            },
            "required": ["notebook_id"]
        }
    ),

    # --- Sources ---
    Tool(
        name="list_sources",
        description="List all sources in a notebook. Sources are documents, URLs, YouTube videos, or text that provide context for chat.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"}
            },
            "required": ["notebook_id"]
        }
    ),
    Tool(
        name="add_text_source",
        description="Add text content as a source to a notebook. Useful for pasting articles, notes, or any text content.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "name": {"type": "string", "description": "Name for this source"},
                "content": {"type": "string", "description": "The text content to add"},
                "user_id": {"type": "string", "description": "The user ID"}
            },
            "required": ["notebook_id", "name", "content", "user_id"]
        }
    ),
    Tool(
        name="add_url_source",
        description="Add a website URL as a source. The content will be fetched and indexed.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "url": {"type": "string", "description": "The URL to add"},
                "user_id": {"type": "string", "description": "The user ID"}
            },
            "required": ["notebook_id", "url", "user_id"]
        }
    ),
    Tool(
        name="add_youtube_source",
        description="Add a YouTube video as a source. The transcript will be extracted and indexed.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "youtube_url": {"type": "string", "description": "The YouTube video URL"},
                "user_id": {"type": "string", "description": "The user ID"}
            },
            "required": ["notebook_id", "youtube_url", "user_id"]
        }
    ),
    Tool(
        name="get_source",
        description="Get details of a specific source including its content summary.",
        inputSchema={
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "The source ID"}
            },
            "required": ["source_id"]
        }
    ),
    Tool(
        name="delete_source",
        description="Delete a source from a notebook.",
        inputSchema={
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "The source ID to delete"}
            },
            "required": ["source_id"]
        }
    ),

    # --- Chat (RAG) ---
    Tool(
        name="chat_with_sources",
        description="Ask a question about the sources in a notebook. Uses RAG to provide answers with citations.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "message": {"type": "string", "description": "Your question or message"},
                "user_id": {"type": "string", "description": "The user ID"},
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific source IDs to query (defaults to all)"
                },
                "model": {
                    "type": "string",
                    "description": "Model to use (gemini-2.0-flash, gemini-2.5-pro)",
                    "default": "gemini-2.0-flash"
                }
            },
            "required": ["notebook_id", "message", "user_id"]
        }
    ),
    Tool(
        name="global_chat",
        description="Ask a question across multiple notebooks at once. Useful for cross-referencing research.",
        inputSchema={
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "Your question"},
                "user_id": {"type": "string", "description": "The user ID"},
                "notebook_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific notebook IDs to query (defaults to all)"
                }
            },
            "required": ["message", "user_id"]
        }
    ),

    # --- Study Materials ---
    Tool(
        name="generate_flashcards",
        description="Generate flashcards from notebook sources for studying.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "count": {"type": "integer", "description": "Number of flashcards (10-100)", "default": 10},
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id"]
        }
    ),
    Tool(
        name="generate_quiz",
        description="Generate a multiple-choice quiz from notebook sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "question_count": {"type": "integer", "description": "Number of questions (5-50)", "default": 10},
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id"]
        }
    ),
    Tool(
        name="generate_study_guide",
        description="Generate a comprehensive study guide from notebook sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id"]
        }
    ),
    Tool(
        name="generate_faq",
        description="Generate frequently asked questions and answers from notebook sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "count": {"type": "integer", "description": "Number of FAQ items (5-50)", "default": 10},
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id"]
        }
    ),

    # --- Audio Generation ---
    Tool(
        name="generate_audio_overview",
        description="Generate a podcast-style audio overview of notebook sources. Formats: deep_dive (10-15 min discussion), brief (2-3 min summary), critique (analysis), debate (opposing views).",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "user_id": {"type": "string", "description": "The user ID"},
                "format": {
                    "type": "string",
                    "enum": ["deep_dive", "brief", "critique", "debate"],
                    "description": "Audio format type",
                    "default": "deep_dive"
                },
                "custom_instructions": {
                    "type": "string",
                    "description": "Optional custom instructions for the script"
                },
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id", "user_id"]
        }
    ),
    Tool(
        name="get_audio_status",
        description="Get the status and download URL of an audio generation job.",
        inputSchema={
            "type": "object",
            "properties": {
                "audio_id": {"type": "string", "description": "The audio overview ID"}
            },
            "required": ["audio_id"]
        }
    ),

    # --- Research ---
    Tool(
        name="start_research",
        description="Start a deep research task on a topic. Uses AI to gather and synthesize information.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID to save research to"},
                "user_id": {"type": "string", "description": "The user ID"},
                "query": {"type": "string", "description": "The research question or topic"},
                "mode": {
                    "type": "string",
                    "enum": ["fast", "deep"],
                    "description": "Research depth",
                    "default": "fast"
                }
            },
            "required": ["notebook_id", "user_id", "query"]
        }
    ),
    Tool(
        name="get_research_status",
        description="Get the status and results of a research task.",
        inputSchema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The research task ID"}
            },
            "required": ["task_id"]
        }
    ),

    # --- Notes ---
    Tool(
        name="create_note",
        description="Create a note in a notebook for saving insights or ideas.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "user_id": {"type": "string", "description": "The user ID"},
                "title": {"type": "string", "description": "Note title"},
                "content": {"type": "string", "description": "Note content (markdown supported)"},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional tags for organization"
                }
            },
            "required": ["notebook_id", "user_id", "title", "content"]
        }
    ),
    Tool(
        name="list_notes",
        description="List all notes in a notebook.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"}
            },
            "required": ["notebook_id"]
        }
    ),

    # --- Studio (Reports & Outputs) ---
    Tool(
        name="generate_report",
        description="Generate a structured briefing document or report from notebook sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "user_id": {"type": "string", "description": "The user ID"},
                "title": {"type": "string", "description": "Report title"},
                "custom_instructions": {
                    "type": "string",
                    "description": "Optional instructions for report focus"
                },
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id", "user_id", "title"]
        }
    ),
    Tool(
        name="generate_data_table",
        description="Generate a structured data table from notebook sources.",
        inputSchema={
            "type": "object",
            "properties": {
                "notebook_id": {"type": "string", "description": "The notebook ID"},
                "user_id": {"type": "string", "description": "The user ID"},
                "title": {"type": "string", "description": "Table title"},
                "custom_instructions": {
                    "type": "string",
                    "description": "Instructions for what data to extract"
                },
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: specific sources to use"
                }
            },
            "required": ["notebook_id", "user_id", "title"]
        }
    ),
]


# ============================================================================
# Tool Handlers
# ============================================================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return the list of available tools."""
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    try:
        result = await handle_tool(name, arguments)
        return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}, indent=2))]


async def handle_tool(name: str, args: dict) -> dict:
    """Route tool calls to handlers."""

    # --- Notebooks ---
    if name == "list_notebooks":
        return await list_notebooks(args["user_id"])

    elif name == "create_notebook":
        return await create_notebook(
            user_id=args["user_id"],
            name=args["name"],
            description=args.get("description"),
            emoji=args.get("emoji", "📓")
        )

    elif name == "get_notebook":
        return await get_notebook(args["notebook_id"])

    elif name == "delete_notebook":
        return await delete_notebook(args["notebook_id"])

    # --- Sources ---
    elif name == "list_sources":
        return await list_sources(args["notebook_id"])

    elif name == "add_text_source":
        return await add_text_source(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            name=args["name"],
            content=args["content"]
        )

    elif name == "add_url_source":
        return await add_url_source(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            url=args["url"]
        )

    elif name == "add_youtube_source":
        return await add_youtube_source(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            youtube_url=args["youtube_url"]
        )

    elif name == "get_source":
        return await get_source(args["source_id"])

    elif name == "delete_source":
        return await delete_source(args["source_id"])

    # --- Chat ---
    elif name == "chat_with_sources":
        return await chat_with_sources(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            message=args["message"],
            source_ids=args.get("source_ids"),
            model=args.get("model", "gemini-2.0-flash")
        )

    elif name == "global_chat":
        return await global_chat(
            user_id=args["user_id"],
            message=args["message"],
            notebook_ids=args.get("notebook_ids")
        )

    # --- Study Materials ---
    elif name == "generate_flashcards":
        return await generate_flashcards(
            notebook_id=args["notebook_id"],
            count=args.get("count", 10),
            source_ids=args.get("source_ids")
        )

    elif name == "generate_quiz":
        return await generate_quiz(
            notebook_id=args["notebook_id"],
            question_count=args.get("question_count", 10),
            source_ids=args.get("source_ids")
        )

    elif name == "generate_study_guide":
        return await generate_study_guide(
            notebook_id=args["notebook_id"],
            source_ids=args.get("source_ids")
        )

    elif name == "generate_faq":
        return await generate_faq(
            notebook_id=args["notebook_id"],
            count=args.get("count", 10),
            source_ids=args.get("source_ids")
        )

    # --- Audio ---
    elif name == "generate_audio_overview":
        return await generate_audio_overview(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            format_type=args.get("format", "deep_dive"),
            custom_instructions=args.get("custom_instructions"),
            source_ids=args.get("source_ids")
        )

    elif name == "get_audio_status":
        return await get_audio_status(args["audio_id"])

    # --- Research ---
    elif name == "start_research":
        return await start_research(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            query=args["query"],
            mode=args.get("mode", "fast")
        )

    elif name == "get_research_status":
        return await get_research_status(args["task_id"])

    # --- Notes ---
    elif name == "create_note":
        return await create_note(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            title=args["title"],
            content=args["content"],
            tags=args.get("tags", [])
        )

    elif name == "list_notes":
        return await list_notes(args["notebook_id"])

    # --- Studio ---
    elif name == "generate_report":
        return await generate_report(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            title=args["title"],
            custom_instructions=args.get("custom_instructions"),
            source_ids=args.get("source_ids")
        )

    elif name == "generate_data_table":
        return await generate_data_table(
            notebook_id=args["notebook_id"],
            user_id=args["user_id"],
            title=args["title"],
            custom_instructions=args.get("custom_instructions"),
            source_ids=args.get("source_ids")
        )

    else:
        raise ValueError(f"Unknown tool: {name}")


# ============================================================================
# Implementation Functions
# ============================================================================

async def list_notebooks(user_id: str) -> dict:
    """List all notebooks for a user."""
    supabase = get_supabase()
    result = supabase.table("notebooks").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()

    notebooks = []
    for nb in result.data:
        # Get source count
        sources = supabase.table("sources").select("id", count="exact").eq("notebook_id", nb["id"]).execute()
        notebooks.append({
            "id": nb["id"],
            "name": nb["name"],
            "description": nb.get("description"),
            "emoji": nb.get("emoji", "📓"),
            "source_count": sources.count or 0,
            "created_at": nb["created_at"],
            "updated_at": nb["updated_at"]
        })

    return {"notebooks": notebooks, "count": len(notebooks)}


async def create_notebook(user_id: str, name: str, description: Optional[str] = None, emoji: str = "📓") -> dict:
    """Create a new notebook."""
    supabase = get_supabase()

    data = {
        "user_id": user_id,
        "name": name,
        "description": description,
        "emoji": emoji,
        "settings": {}
    }

    result = supabase.table("notebooks").insert(data).execute()
    return {"notebook": result.data[0], "message": "Notebook created successfully"}


async def get_notebook(notebook_id: str) -> dict:
    """Get notebook details with sources."""
    supabase = get_supabase()

    notebook = supabase.table("notebooks").select("*").eq("id", notebook_id).single().execute()
    sources = supabase.table("sources").select("id, name, type, status, created_at").eq("notebook_id", notebook_id).execute()

    return {
        "notebook": notebook.data,
        "sources": sources.data,
        "source_count": len(sources.data)
    }


async def delete_notebook(notebook_id: str) -> dict:
    """Delete a notebook and all contents."""
    supabase = get_supabase()

    # Delete related data first
    supabase.table("sources").delete().eq("notebook_id", notebook_id).execute()
    supabase.table("chat_sessions").delete().eq("notebook_id", notebook_id).execute()
    supabase.table("notes").delete().eq("notebook_id", notebook_id).execute()
    supabase.table("audio_overviews").delete().eq("notebook_id", notebook_id).execute()
    supabase.table("research_tasks").delete().eq("notebook_id", notebook_id).execute()
    supabase.table("studio_outputs").delete().eq("notebook_id", notebook_id).execute()

    # Delete notebook
    supabase.table("notebooks").delete().eq("id", notebook_id).execute()

    return {"message": "Notebook deleted successfully"}


async def list_sources(notebook_id: str) -> dict:
    """List sources in a notebook."""
    supabase = get_supabase()
    result = supabase.table("sources").select("*").eq("notebook_id", notebook_id).order("created_at", desc=True).execute()

    return {"sources": result.data, "count": len(result.data)}


async def add_text_source(notebook_id: str, user_id: str, name: str, content: str) -> dict:
    """Add text content as a source."""
    supabase = get_supabase()

    # Generate summary using Gemini
    summary_result = await generate_content(
        prompt=f"""Analyze this content and provide:
1. A concise summary (2-3 paragraphs)
2. Key topics covered (list of 5-10 topics)
3. 5 suggested questions

Content:
{content[:10000]}

Format as JSON:
{{"summary": "...", "topics": ["..."], "suggested_questions": ["..."]}}""",
        model_name="gemini-2.0-flash"
    )

    try:
        # Try to parse JSON from response
        summary_text = summary_result["content"]
        if "```json" in summary_text:
            summary_text = summary_text.split("```json")[1].split("```")[0]
        elif "```" in summary_text:
            summary_text = summary_text.split("```")[1].split("```")[0]
        source_guide = json.loads(summary_text)
    except:
        source_guide = {"summary": summary_result["content"], "topics": [], "suggested_questions": []}

    # Create source record
    data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "text",
        "name": name,
        "status": "ready",
        "metadata": {"content": content[:50000], "char_count": len(content)},
        "source_guide": source_guide,
        "token_count": len(content.split()) * 1.3  # Rough estimate
    }

    result = supabase.table("sources").insert(data).execute()

    return {
        "source": result.data[0],
        "usage": summary_result["usage"],
        "message": "Text source added successfully"
    }


async def add_url_source(notebook_id: str, user_id: str, url: str) -> dict:
    """Add a URL as a source (placeholder - would need web scraping)."""
    supabase = get_supabase()

    # In production, this would fetch and parse the URL content
    data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "url",
        "name": url,
        "status": "pending",
        "metadata": {"url": url},
    }

    result = supabase.table("sources").insert(data).execute()

    return {
        "source": result.data[0],
        "message": "URL source added. Content will be fetched and indexed."
    }


async def add_youtube_source(notebook_id: str, user_id: str, youtube_url: str) -> dict:
    """Add a YouTube video as a source (placeholder - would need transcript API)."""
    supabase = get_supabase()

    # In production, this would fetch the transcript
    data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "youtube",
        "name": youtube_url,
        "status": "pending",
        "metadata": {"youtube_url": youtube_url},
    }

    result = supabase.table("sources").insert(data).execute()

    return {
        "source": result.data[0],
        "message": "YouTube source added. Transcript will be fetched and indexed."
    }


async def get_source(source_id: str) -> dict:
    """Get source details."""
    supabase = get_supabase()
    result = supabase.table("sources").select("*").eq("id", source_id).single().execute()
    return {"source": result.data}


async def delete_source(source_id: str) -> dict:
    """Delete a source."""
    supabase = get_supabase()
    supabase.table("sources").delete().eq("id", source_id).execute()
    return {"message": "Source deleted successfully"}


async def get_source_content(notebook_id: str, source_ids: Optional[List[str]] = None) -> tuple[str, List[dict]]:
    """Get content from sources for RAG."""
    supabase = get_supabase()

    query = supabase.table("sources").select("*").eq("notebook_id", notebook_id).eq("status", "ready")
    if source_ids:
        query = query.in_("id", source_ids)

    result = query.execute()

    context_parts = []
    sources = []

    for source in result.data:
        source_guide = source.get("source_guide") or {}
        metadata = source.get("metadata") or {}

        content = ""
        if source_guide.get("summary"):
            content = source_guide["summary"]
        elif metadata.get("content"):
            content = metadata["content"][:5000]
        elif metadata.get("transcript"):
            content = metadata["transcript"][:5000]

        if content:
            context_parts.append(f"[Source: {source['name']}]\n{content}\n")
            sources.append({"id": source["id"], "name": source["name"], "type": source["type"]})

    return "\n".join(context_parts), sources


async def chat_with_sources(
    notebook_id: str,
    user_id: str,
    message: str,
    source_ids: Optional[List[str]] = None,
    model: str = "gemini-2.0-flash"
) -> dict:
    """Chat with sources using RAG."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available in this notebook", "sources": []}

    system_instruction = """You are a helpful research assistant. Answer questions based on the provided sources.
Always cite your sources using [1], [2], etc. notation when referencing specific information.
If the information is not in the sources, say so clearly.
Be concise but thorough."""

    source_context = ""
    for i, s in enumerate(sources, 1):
        source_context += f"[{i}] {s['name']}\n"

    prompt = f"""Sources:
{context}

Source Index:
{source_context}

User Question: {message}

Provide a well-cited response:"""

    result = await generate_content(
        prompt=prompt,
        model_name=model,
        system_instruction=system_instruction
    )

    # Store in chat history
    supabase = get_supabase()
    session_data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "title": message[:50]
    }
    session = supabase.table("chat_sessions").insert(session_data).execute()

    # Store messages
    messages = [
        {"session_id": session.data[0]["id"], "role": "user", "content": message},
        {"session_id": session.data[0]["id"], "role": "assistant", "content": result["content"]}
    ]
    supabase.table("chat_messages").insert(messages).execute()

    return {
        "response": result["content"],
        "sources": sources,
        "session_id": session.data[0]["id"],
        "usage": result["usage"]
    }


async def global_chat(user_id: str, message: str, notebook_ids: Optional[List[str]] = None) -> dict:
    """Chat across multiple notebooks."""
    supabase = get_supabase()

    # Get notebooks
    query = supabase.table("notebooks").select("id, name, emoji").eq("user_id", user_id)
    if notebook_ids:
        query = query.in_("id", notebook_ids)
    notebooks = query.execute()

    all_context = []
    all_sources = []

    for nb in notebooks.data:
        context, sources = await get_source_content(nb["id"])
        if context:
            all_context.append(f"=== Notebook: {nb.get('emoji', '📓')} {nb['name']} ===\n{context}")
            for s in sources:
                s["notebook_id"] = nb["id"]
                s["notebook_name"] = nb["name"]
                all_sources.append(s)

    if not all_context:
        return {"error": "No sources available in any notebooks", "sources": []}

    system_instruction = """You are a research assistant with access to multiple notebooks.
Answer questions using information from all available sources.
Cite sources as [Notebook: Source Name] when referencing information."""

    result = await generate_content(
        prompt=f"Sources from multiple notebooks:\n\n{chr(10).join(all_context)}\n\nQuestion: {message}",
        model_name="gemini-2.0-flash",
        system_instruction=system_instruction
    )

    return {
        "response": result["content"],
        "sources": all_sources,
        "notebooks_searched": len(notebooks.data),
        "usage": result["usage"]
    }


async def generate_flashcards(notebook_id: str, count: int = 10, source_ids: Optional[List[str]] = None) -> dict:
    """Generate flashcards from sources."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    count = max(5, min(100, count))

    result = await generate_content(
        prompt=f"""Create {count} educational flashcards from this content.
Each flashcard should test understanding of key concepts.

Content:
{context[:15000]}

Format as JSON array:
[{{"question": "...", "answer": "..."}}]"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        flashcards = json.loads(content)
    except:
        flashcards = []

    return {
        "flashcards": flashcards,
        "count": len(flashcards),
        "sources_used": len(sources),
        "usage": result["usage"]
    }


async def generate_quiz(notebook_id: str, question_count: int = 10, source_ids: Optional[List[str]] = None) -> dict:
    """Generate a quiz from sources."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    question_count = max(5, min(50, question_count))

    result = await generate_content(
        prompt=f"""Create a {question_count}-question multiple choice quiz from this content.
Each question should have 4 options with one correct answer.

Content:
{context[:15000]}

Format as JSON array:
[{{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_index": 0, "explanation": "..."}}]"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        questions = json.loads(content)
    except:
        questions = []

    return {
        "questions": questions,
        "count": len(questions),
        "sources_used": len(sources),
        "usage": result["usage"]
    }


async def generate_study_guide(notebook_id: str, source_ids: Optional[List[str]] = None) -> dict:
    """Generate a study guide from sources."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    result = await generate_content(
        prompt=f"""Create a comprehensive study guide from this content.

Content:
{context[:15000]}

Format as JSON:
{{
    "title": "...",
    "summary": "...",
    "key_concepts": [{{"term": "...", "definition": "...", "importance": "..."}}],
    "glossary": [{{"term": "...", "definition": "..."}}],
    "review_questions": ["...", "..."]
}}"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        guide = json.loads(content)
    except:
        guide = {"title": "Study Guide", "content": result["content"]}

    return {
        "study_guide": guide,
        "sources_used": len(sources),
        "usage": result["usage"]
    }


async def generate_faq(notebook_id: str, count: int = 10, source_ids: Optional[List[str]] = None) -> dict:
    """Generate FAQ from sources."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    count = max(5, min(50, count))

    result = await generate_content(
        prompt=f"""Generate {count} frequently asked questions and answers about this content.
Focus on common questions a reader might have.

Content:
{context[:15000]}

Format as JSON array:
[{{"question": "...", "answer": "..."}}]"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        faq = json.loads(content)
    except:
        faq = []

    return {
        "faq": faq,
        "count": len(faq),
        "sources_used": len(sources),
        "usage": result["usage"]
    }


async def generate_audio_overview(
    notebook_id: str,
    user_id: str,
    format_type: str = "deep_dive",
    custom_instructions: Optional[str] = None,
    source_ids: Optional[List[str]] = None
) -> dict:
    """Generate audio overview (script only in MCP - full audio via API)."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    format_prompts = {
        "deep_dive": "Create an engaging 10-15 minute two-host podcast script exploring this topic in depth.",
        "brief": "Create a concise 2-3 minute single-speaker summary of the key points.",
        "critique": "Create a 5-10 minute two-host analytical discussion examining strengths and weaknesses.",
        "debate": "Create an 8-15 minute two-host debate script with opposing viewpoints.",
    }

    prompt = format_prompts.get(format_type, format_prompts["deep_dive"])
    if custom_instructions:
        prompt += f"\n\nAdditional instructions: {custom_instructions}"

    result = await generate_content(
        prompt=f"""{prompt}

Content to discuss:
{context[:15000]}

Format the script with clear speaker labels (Host 1:, Host 2:, or Speaker:) for each line.""",
        model_name="gemini-2.5-pro"
    )

    # Store in database
    supabase = get_supabase()
    audio_data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "format": format_type,
        "status": "script_ready",
        "script": result["content"],
        "cost_usd": result["usage"]["cost_usd"]
    }
    audio_record = supabase.table("audio_overviews").insert(audio_data).execute()

    return {
        "audio_id": audio_record.data[0]["id"],
        "status": "script_ready",
        "script": result["content"],
        "message": "Script generated. Use the API to generate full audio.",
        "usage": result["usage"]
    }


async def get_audio_status(audio_id: str) -> dict:
    """Get audio generation status."""
    supabase = get_supabase()
    result = supabase.table("audio_overviews").select("*").eq("id", audio_id).single().execute()
    return {"audio": result.data}


async def start_research(notebook_id: str, user_id: str, query: str, mode: str = "fast") -> dict:
    """Start a research task."""
    supabase = get_supabase()

    # Create task record
    task_data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "query": query,
        "mode": mode,
        "status": "in_progress"
    }
    task = supabase.table("research_tasks").insert(task_data).execute()
    task_id = task.data[0]["id"]

    # Generate research report
    depth = "comprehensive and detailed" if mode == "deep" else "concise but thorough"

    result = await generate_content(
        prompt=f"""Create a {depth} research report on: {query}

Structure your report with:
1. Executive Summary
2. Key Findings
3. Analysis
4. Conclusion

Use markdown formatting.""",
        model_name="gemini-2.5-pro"
    )

    # Update task with results
    supabase.table("research_tasks").update({
        "status": "completed",
        "report_content": result["content"],
        "cost_usd": result["usage"]["cost_usd"]
    }).eq("id", task_id).execute()

    return {
        "task_id": task_id,
        "status": "completed",
        "report": result["content"],
        "usage": result["usage"]
    }


async def get_research_status(task_id: str) -> dict:
    """Get research task status."""
    supabase = get_supabase()
    result = supabase.table("research_tasks").select("*").eq("id", task_id).single().execute()
    return {"task": result.data}


async def create_note(notebook_id: str, user_id: str, title: str, content: str, tags: List[str] = None) -> dict:
    """Create a note."""
    supabase = get_supabase()

    data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "written",
        "title": title,
        "content": content,
        "tags": tags or [],
        "is_pinned": False
    }

    result = supabase.table("notes").insert(data).execute()
    return {"note": result.data[0], "message": "Note created successfully"}


async def list_notes(notebook_id: str) -> dict:
    """List notes in a notebook."""
    supabase = get_supabase()
    result = supabase.table("notes").select("*").eq("notebook_id", notebook_id).order("is_pinned", desc=True).order("created_at", desc=True).execute()
    return {"notes": result.data, "count": len(result.data)}


async def generate_report(
    notebook_id: str,
    user_id: str,
    title: str,
    custom_instructions: Optional[str] = None,
    source_ids: Optional[List[str]] = None
) -> dict:
    """Generate a briefing report."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    extra = f"\n\nFocus: {custom_instructions}" if custom_instructions else ""

    result = await generate_content(
        prompt=f"""Create a professional briefing document titled "{title}".{extra}

Content:
{context[:15000]}

Format as JSON:
{{
    "title": "...",
    "executive_summary": "...",
    "sections": [{{"title": "...", "content": "..."}}],
    "key_findings": ["..."],
    "conclusion": "..."
}}"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        report = json.loads(content)
    except:
        report = {"title": title, "content": result["content"]}

    # Store in database
    supabase = get_supabase()
    output_data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "report",
        "status": "completed",
        "title": title,
        "content": report,
        "cost_usd": result["usage"]["cost_usd"]
    }
    output = supabase.table("studio_outputs").insert(output_data).execute()

    return {
        "output_id": output.data[0]["id"],
        "report": report,
        "usage": result["usage"]
    }


async def generate_data_table(
    notebook_id: str,
    user_id: str,
    title: str,
    custom_instructions: Optional[str] = None,
    source_ids: Optional[List[str]] = None
) -> dict:
    """Generate a data table."""
    context, sources = await get_source_content(notebook_id, source_ids)

    if not context:
        return {"error": "No sources available"}

    extra = f"\n\nExtract: {custom_instructions}" if custom_instructions else ""

    result = await generate_content(
        prompt=f"""Create a structured data table titled "{title}" from this content.{extra}

Content:
{context[:15000]}

Format as JSON:
{{
    "title": "...",
    "columns": ["Column1", "Column2", ...],
    "rows": [["value1", "value2", ...], ...]
}}"""
    )

    try:
        content = result["content"]
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        table = json.loads(content)
    except:
        table = {"title": title, "columns": [], "rows": []}

    # Store in database
    supabase = get_supabase()
    output_data = {
        "notebook_id": notebook_id,
        "user_id": user_id,
        "type": "data_table",
        "status": "completed",
        "title": title,
        "content": table,
        "cost_usd": result["usage"]["cost_usd"]
    }
    output = supabase.table("studio_outputs").insert(output_data).execute()

    return {
        "output_id": output.data[0]["id"],
        "table": table,
        "usage": result["usage"]
    }


# ============================================================================
# Server Entry Point
# ============================================================================

def main():
    """Run the MCP server."""
    import asyncio
    asyncio.run(run_server())


async def run_server():
    """Start the stdio server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    main()

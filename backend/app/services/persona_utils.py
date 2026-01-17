"""Utilities for building persona instructions from notebook settings."""

from typing import Optional


def build_persona_instructions(settings: Optional[dict]) -> str:
    """Build system instructions from notebook persona settings.

    Args:
        settings: Notebook settings dictionary containing persona and preferences

    Returns:
        Formatted string of persona instructions, or empty string if no settings
    """
    if not settings:
        return ""

    parts = []
    persona = settings.get("persona", {})
    preferences = settings.get("preferences", {})

    # Add persona instructions
    if persona.get("enabled") and persona.get("instructions"):
        persona_name = persona.get("name", "Custom")
        parts.append(f"[NOTEBOOK PERSONA: {persona_name}]")
        parts.append(persona.get("instructions"))

    # Add preferences
    pref_parts = []

    response_length = preferences.get("responseLength", "balanced")
    if response_length == "concise":
        pref_parts.append("Keep responses brief and to-the-point.")
    elif response_length == "detailed":
        pref_parts.append("Provide comprehensive, detailed explanations.")

    tone = preferences.get("tone", "professional")
    if tone == "casual":
        pref_parts.append("Use a friendly, conversational tone.")
    elif tone == "academic":
        pref_parts.append("Use formal, scholarly language.")

    if not preferences.get("includeExamples", True):
        pref_parts.append("Do not include examples unless specifically asked.")

    citation_style = preferences.get("citationStyle", "inline")
    if citation_style == "none":
        pref_parts.append("Do not include source citations.")
    elif citation_style == "footnote":
        pref_parts.append("Place all citations as footnotes at the end of your response.")

    if pref_parts:
        parts.append("")
        parts.append("[PREFERENCES]")
        parts.append(" ".join(pref_parts))

    if parts:
        parts.append("")
        parts.append("---")

    return "\n".join(parts)


def get_notebook_with_settings(supabase, notebook_id: str, user_id: str) -> dict:
    """Get notebook data including settings.

    Args:
        supabase: Supabase client
        notebook_id: UUID of the notebook
        user_id: UUID of the user

    Returns:
        Notebook data dictionary

    Raises:
        HTTPException: If notebook not found
    """
    from fastapi import HTTPException

    result = (
        supabase.table("notebooks")
        .select("id, settings")
        .eq("id", notebook_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return result.data

# NotebookLM Reimagined MCP Server

An MCP (Model Context Protocol) server that exposes NotebookLM Reimagined's research intelligence capabilities as tools for LLMs.

## Features

This MCP server provides **20+ tools** for:

| Category | Tools |
|----------|-------|
| **Notebooks** | `list_notebooks`, `create_notebook`, `get_notebook`, `delete_notebook` |
| **Sources** | `list_sources`, `add_text_source`, `add_url_source`, `add_youtube_source`, `get_source`, `delete_source` |
| **Chat (RAG)** | `chat_with_sources`, `global_chat` |
| **Study Materials** | `generate_flashcards`, `generate_quiz`, `generate_study_guide`, `generate_faq` |
| **Audio** | `generate_audio_overview`, `get_audio_status` |
| **Research** | `start_research`, `get_research_status` |
| **Notes** | `create_note`, `list_notes` |
| **Studio** | `generate_report`, `generate_data_table` |

## Installation

### Option 1: Install from source

```bash
cd mcp-server
pip install -e .
```

### Option 2: Install dependencies directly

```bash
pip install mcp httpx python-dotenv supabase google-generativeai pydantic
```

## Configuration

Create a `.env` file in the `mcp-server` directory (or set environment variables):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
```

## Usage

### Running the Server

```bash
# If installed
notebooklm-mcp

# Or directly
python -m notebooklm_mcp.server
```

### Adding to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "python",
      "args": ["-m", "notebooklm_mcp.server"],
      "cwd": "/path/to/NotebookLM Re-Mastered/mcp-server",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GOOGLE_API_KEY": "your-google-api-key"
      }
    }
  }
}
```

### Adding to Claude Code

Add to your Claude Code settings (`.claude/settings.json` or global settings):

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "python",
      "args": ["-m", "notebooklm_mcp.server"],
      "cwd": "/path/to/NotebookLM Re-Mastered/mcp-server",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GOOGLE_API_KEY": "your-google-api-key"
      }
    }
  }
}
```

## Tool Reference

### Notebooks

#### `list_notebooks`
List all notebooks for a user.
```json
{"user_id": "uuid"}
```

#### `create_notebook`
Create a new notebook.
```json
{
  "user_id": "uuid",
  "name": "My Research",
  "description": "Optional description",
  "emoji": "📚"
}
```

#### `get_notebook`
Get notebook details with sources.
```json
{"notebook_id": "uuid"}
```

#### `delete_notebook`
Delete a notebook and all its contents.
```json
{"notebook_id": "uuid"}
```

### Sources

#### `add_text_source`
Add text content as a source.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "name": "Article Notes",
  "content": "The full text content..."
}
```

#### `add_url_source`
Add a website URL as a source.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "url": "https://example.com/article"
}
```

#### `add_youtube_source`
Add a YouTube video as a source.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "youtube_url": "https://youtube.com/watch?v=..."
}
```

### Chat (RAG)

#### `chat_with_sources`
Ask questions about your sources with citations.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "message": "What are the main themes discussed?",
  "source_ids": ["uuid1", "uuid2"],  // optional
  "model": "gemini-2.0-flash"  // optional
}
```

#### `global_chat`
Query across multiple notebooks.
```json
{
  "user_id": "uuid",
  "message": "Compare the approaches discussed",
  "notebook_ids": ["uuid1", "uuid2"]  // optional, defaults to all
}
```

### Study Materials

#### `generate_flashcards`
Generate study flashcards.
```json
{
  "notebook_id": "uuid",
  "count": 20,
  "source_ids": ["uuid1"]  // optional
}
```

#### `generate_quiz`
Generate a multiple-choice quiz.
```json
{
  "notebook_id": "uuid",
  "question_count": 15,
  "source_ids": ["uuid1"]  // optional
}
```

#### `generate_study_guide`
Generate a comprehensive study guide.
```json
{
  "notebook_id": "uuid",
  "source_ids": ["uuid1"]  // optional
}
```

#### `generate_faq`
Generate FAQ from sources.
```json
{
  "notebook_id": "uuid",
  "count": 10,
  "source_ids": ["uuid1"]  // optional
}
```

### Audio

#### `generate_audio_overview`
Generate a podcast-style script (full audio via API).
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "format": "deep_dive",  // deep_dive, brief, critique, debate
  "custom_instructions": "Focus on practical applications",
  "source_ids": ["uuid1"]  // optional
}
```

### Research

#### `start_research`
Start a deep research task.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "query": "What are the latest developments in quantum computing?",
  "mode": "deep"  // fast or deep
}
```

### Notes

#### `create_note`
Create a note in a notebook.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "title": "Key Insights",
  "content": "## Summary\n\n- Point 1\n- Point 2",
  "tags": ["insights", "summary"]
}
```

### Studio

#### `generate_report`
Generate a briefing document.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "title": "Q4 Research Summary",
  "custom_instructions": "Focus on actionable recommendations",
  "source_ids": ["uuid1"]  // optional
}
```

#### `generate_data_table`
Generate a structured data table.
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "title": "Comparison Matrix",
  "custom_instructions": "Extract feature comparisons",
  "source_ids": ["uuid1"]  // optional
}
```

## Response Format

All tools return JSON with consistent structure:

```json
{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.0-flash"
  }
}
```

## Example Workflow

```
1. Create a notebook
   → create_notebook(user_id, "AI Research", "Research on LLMs")

2. Add sources
   → add_text_source(notebook_id, user_id, "Paper Summary", "...")
   → add_url_source(notebook_id, user_id, "https://arxiv.org/...")

3. Chat with sources
   → chat_with_sources(notebook_id, user_id, "What are the key findings?")

4. Generate study materials
   → generate_flashcards(notebook_id, count=20)
   → generate_quiz(notebook_id, question_count=10)

5. Create outputs
   → generate_report(notebook_id, user_id, "Research Summary")
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/
```

## Architecture

```
mcp-server/
├── pyproject.toml          # Package configuration
├── README.md               # This file
└── src/
    └── notebooklm_mcp/
        ├── __init__.py
        └── server.py       # Main MCP server implementation
```

The MCP server:
- Connects directly to Supabase for data storage
- Uses Gemini API for AI operations
- Exposes all functionality as MCP tools
- Returns usage/cost information with every response

## Related

- [NotebookLM Reimagined API](../backend/) - REST API
- [NotebookLM Reimagined Frontend](../frontend/) - Web UI
- [MCP Specification](https://modelcontextprotocol.io/) - Protocol docs

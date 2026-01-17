'use client';

import { Copy, Check, ChevronDown, ChevronRight, Key, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';


interface EndpointProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseExample?: string;
  notes?: string;
}

const methodColors = {
  GET: 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30',
  POST: 'bg-[var(--info)]/20 text-[var(--info)] border-[var(--info)]/30',
  PATCH: 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30',
  DELETE: 'bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 rounded bg-[var(--bg-surface)] p-1.5 transition-colors hover:bg-[var(--bg-tertiary)]"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-[var(--success)]" />
      ) : (
        <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
      )}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  requestBody,
  responseExample,
  notes,
}: EndpointProps) {
  const [expanded, setExpanded] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app';
  const fullPath = `${baseUrl}${path}`;

  let curlCommand = `curl -X ${method} "${fullPath}" \\
  -H "X-API-Key: YOUR_API_KEY"`;

  if (requestBody) {
    curlCommand += ` \\
  -H "Content-Type: application/json" \\
  -d '${requestBody}'`;
  }

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-[var(--border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
        )}
        <span
          className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${methodColors[method]}`}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-[var(--text-secondary)]">{path}</code>
        <span className="ml-auto text-sm text-[var(--text-tertiary)]">{description}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-[var(--border)] px-4 pt-4 pb-4">
          {notes && <p className="text-sm text-[var(--text-secondary)]">{notes}</p>}

          <div>
            <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">cURL</h4>
            <CodeBlock code={curlCommand} />
          </div>

          {requestBody && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                Request Body
              </h4>
              <CodeBlock code={JSON.stringify(JSON.parse(requestBody), null, 2)} language="json" />
            </div>
          )}

          {responseExample && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                Response Example
              </h4>
              <CodeBlock code={responseExample} language="json" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="mb-4 border-b border-[var(--border)] pb-2 text-xl font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ApiDocsPage() {
  const sections = [
    { id: 'authentication', title: 'Authentication' },
    { id: 'notebooks', title: 'Notebooks' },
    { id: 'sources', title: 'Sources' },
    { id: 'chat', title: 'Chat' },
    { id: 'global-chat', title: 'Global Chat' },
    { id: 'audio', title: 'Audio Overviews' },
    { id: 'video', title: 'Video Overviews' },
    { id: 'research', title: 'Deep Research' },
    { id: 'study', title: 'Study Materials' },
    { id: 'notes', title: 'Notes' },
    { id: 'studio', title: 'Studio Outputs' },
    { id: 'api-keys', title: 'API Key Management' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">API Documentation</h1>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Key className="mr-2 h-4 w-4" />
              Manage API Keys
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        {/* Sidebar */}
        <nav className="hidden w-56 flex-shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mb-3 text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
              Contents
            </p>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]"
              >
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {/* Authentication */}
          <Section id="authentication" title="Authentication">
            <div className="prose prose-invert mb-6 max-w-none">
              <p className="text-[var(--text-secondary)]">
                All API requests require authentication via an API key. Include your API key in the{' '}
                <code className="text-[var(--accent-primary)]">X-API-Key</code> header.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h4 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
                Example Request
              </h4>
              <CodeBlock
                code={`curl -X GET "https://notebooklm-api.vercel.app/api/v1/notebooks" \\
  -H "X-API-Key: nb_live_your_api_key_here"`}
              />
            </div>

            <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
              <h4 className="mb-2 font-medium text-[var(--accent-primary)]">Important Notes</h4>
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                <li>
                  API keys start with <code className="text-[var(--accent-primary)]">nb_live_</code>
                </li>
                <li>Keep your API key secret - never expose it in client-side code</li>
                <li>API keys have rate limits (default: 60 req/min, 10,000 req/day)</li>
                <li>
                  Create and manage API keys in{' '}
                  <Link href="/settings" className="text-[var(--accent-primary)] hover:underline">
                    Settings
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">
                Response Format
              </h3>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                All responses follow this format:
              </p>
              <CodeBlock
                code={`{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "gemini-2.0-flash"
  },
  "meta": {}
}`}
                language="json"
              />
            </div>
          </Section>

          {/* Notebooks */}
          <Section id="notebooks" title="Notebooks">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Manage your notebooks - containers for sources, chats, and generated content.
            </p>

            <Endpoint
              method="GET"
              path="/api/v1/notebooks"
              description="List all notebooks"
              responseExample={`{
  "data": [
    {
      "id": "uuid-here",
      "name": "My Research",
      "description": "Research on AI",
      "emoji": "📓",
      "source_count": 5,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks"
              description="Create a new notebook"
              requestBody={`{"name": "My New Notebook", "description": "Optional description", "emoji": "📚"}`}
              responseExample={`{
  "data": {
    "id": "new-uuid",
    "name": "My New Notebook",
    "description": "Optional description",
    "emoji": "📚",
    "source_count": 0,
    "created_at": "2025-01-15T10:00:00Z"
  }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}"
              description="Get a specific notebook"
            />

            <Endpoint
              method="PATCH"
              path="/api/v1/notebooks/{notebook_id}"
              description="Update a notebook"
              requestBody={`{"name": "Updated Name", "emoji": "🔬"}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}"
              description="Delete a notebook"
              notes="This permanently deletes the notebook and all its contents (sources, chats, audio, etc.)"
            />
          </Section>

          {/* Sources */}
          <Section id="sources" title="Sources">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Add and manage sources (documents, URLs, text, YouTube videos) in a notebook.
            </p>

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/sources"
              description="List all sources in a notebook"
              responseExample={`{
  "data": [
    {
      "id": "source-uuid",
      "notebook_id": "notebook-uuid",
      "type": "text",
      "name": "Research Notes",
      "status": "ready",
      "file_size_bytes": 5000,
      "token_count": 1200,
      "source_guide": {
        "summary": "Key points from the document..."
      },
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/sources"
              description="Upload a file (PDF, DOCX, TXT)"
              notes="Use multipart/form-data with a 'file' field"
              requestBody={`# Use multipart form data:
# curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{notebook_id}/sources" \\
#   -H "X-API-Key: YOUR_API_KEY" \\
#   -F "file=@/path/to/document.pdf"`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/sources/text"
              description="Add text content as a source"
              requestBody={`{"name": "My Notes", "content": "This is the text content to add as a source..."}`}
              responseExample={`{
  "data": {
    "id": "source-uuid",
    "type": "text",
    "name": "My Notes",
    "status": "ready",
    "source_guide": {
      "summary": "Generated summary of the content..."
    }
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/sources/url"
              description="Add a website URL as a source"
              requestBody={`{"url": "https://example.com/article", "name": "Optional custom name"}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/sources/youtube"
              description="Add a YouTube video as a source"
              requestBody={`{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "name": "Optional custom name"}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/sources/{source_id}"
              description="Get a specific source"
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/sources/{source_id}"
              description="Delete a source"
            />
          </Section>

          {/* Chat */}
          <Section id="chat" title="Chat">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Chat with your sources using RAG (Retrieval-Augmented Generation). Responses include
              citations.
            </p>

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/chat"
              description="Send a chat message"
              requestBody={`{
  "message": "What are the main findings in the research?",
  "session_id": null,
  "source_ids": ["source-uuid-1", "source-uuid-2"],
  "model": "gemini-2.0-flash"
}`}
              responseExample={`{
  "data": {
    "message_id": "msg-uuid",
    "session_id": "session-uuid",
    "content": "Based on the sources, the main findings are... [1]",
    "citations": [
      {
        "number": 1,
        "source_id": "source-uuid",
        "source_name": "Research Paper",
        "text": "Relevant quote from source...",
        "confidence": 0.9
      }
    ],
    "suggested_questions": [
      "What methodology was used?",
      "What are the implications?"
    ]
  },
  "usage": {
    "input_tokens": 2500,
    "output_tokens": 800,
    "cost_usd": 0.003,
    "model_used": "gemini-2.0-flash"
  }
}`}
              notes="Leave session_id null to start a new chat session, or pass an existing session_id to continue a conversation."
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/chat/sessions"
              description="List chat sessions"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/chat/sessions/{session_id}"
              description="Get a chat session with all messages"
              responseExample={`{
  "data": {
    "session": {
      "id": "session-uuid",
      "title": "Research discussion",
      "created_at": "2025-01-15T10:00:00Z"
    },
    "messages": [
      {"role": "user", "content": "What are the findings?"},
      {"role": "assistant", "content": "The main findings are..."}
    ]
  }
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/chat/sessions/{session_id}"
              description="Delete a chat session"
            />
          </Section>

          {/* Global Chat */}
          <Section id="global-chat" title="Global Chat">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Query across multiple notebooks at once. Search your entire knowledge base without
              knowing which notebook contains the information.
            </p>

            <div className="mb-6 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-4">
              <h4 className="mb-2 font-medium text-[var(--accent-primary)]">Use Cases</h4>
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                <li>• Find information across your entire knowledge base</li>
                <li>• Compare information from different notebooks</li>
                <li>• Search for a topic without knowing which notebook contains it</li>
                <li>• Get answers with notebook attribution in citations</li>
              </ul>
            </div>

            <Endpoint
              method="GET"
              path="/api/v1/chat/global/notebooks"
              description="List notebooks available for global queries"
              responseExample={`{
  "data": [
    {"id": "notebook-uuid-1", "name": "AI Research", "emoji": "🤖"},
    {"id": "notebook-uuid-2", "name": "Product Notes", "emoji": "📦"},
    {"id": "notebook-uuid-3", "name": "Meeting Notes", "emoji": "📝"}
  ]
}`}
              notes="Use this to get notebook IDs before making a global chat query"
            />

            <Endpoint
              method="POST"
              path="/api/v1/chat/global"
              description="Query across multiple notebooks"
              requestBody={`{
  "message": "What are the best practices for API design?",
  "notebook_ids": null,
  "model": "gemini-2.0-flash",
  "max_sources_per_notebook": 10
}`}
              responseExample={`{
  "data": {
    "content": "Based on your knowledge base, here are the key best practices for API design... [1][2]",
    "citations": [
      {
        "number": 1,
        "notebook_id": "notebook-uuid-1",
        "notebook_name": "AI Research",
        "source_id": "source-uuid-1",
        "source_name": "API Design Patterns",
        "text": "RESTful APIs should use consistent naming...",
        "confidence": 0.9
      },
      {
        "number": 2,
        "notebook_id": "notebook-uuid-2",
        "notebook_name": "Product Notes",
        "source_id": "source-uuid-2",
        "source_name": "Engineering Standards",
        "text": "All APIs must be versioned...",
        "confidence": 0.85
      }
    ],
    "notebooks_queried": [
      {"id": "notebook-uuid-1", "name": "AI Research", "emoji": "🤖", "source_count": 5},
      {"id": "notebook-uuid-2", "name": "Product Notes", "emoji": "📦", "source_count": 3}
    ],
    "suggested_questions": [
      "What authentication methods are recommended?",
      "How should API errors be handled?"
    ]
  },
  "usage": {
    "input_tokens": 5000,
    "output_tokens": 800,
    "cost_usd": 0.006,
    "model_used": "gemini-2.0-flash"
  }
}`}
              notes="Set notebook_ids to null to query ALL notebooks, or provide specific UUIDs to query a subset. Citations include notebook attribution."
            />
          </Section>

          {/* Audio */}
          <Section id="audio" title="Audio Overviews">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Generate podcast-style audio summaries of your sources.
            </p>

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/audio/estimate"
              description="Get cost estimate for audio generation"
              requestBody={`{"format": "deep_dive", "source_ids": ["source-uuid-1"]}`}
              responseExample={`{
  "data": {
    "estimated_duration_seconds": 630,
    "estimated_cost_usd": 0.15,
    "format": "deep_dive"
  }
}`}
              notes="Formats: deep_dive (6-15 min), brief (1-3 min), critique (5-10 min), debate (8-15 min)"
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/audio"
              description="Generate audio overview"
              requestBody={`{
  "format": "deep_dive",
  "source_ids": ["source-uuid-1", "source-uuid-2"],
  "custom_instructions": "Focus on the methodology section"
}`}
              responseExample={`{
  "data": {
    "id": "audio-uuid",
    "status": "completed",
    "progress_percent": 100,
    "script": "Generated podcast script...",
    "audio_url": "https://storage.example.com/audio/file.wav",
    "duration_seconds": 420,
    "cost_usd": 0.12
  }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/audio"
              description="List all audio overviews"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/audio/{audio_id}"
              description="Get audio overview status"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/audio/{audio_id}/download"
              description="Get signed download URL"
              responseExample={`{"data": {"download_url": "https://storage.example.com/signed-url"}}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/audio/{audio_id}"
              description="Delete audio overview"
            />
          </Section>

          {/* Video */}
          <Section id="video" title="Video Overviews">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Generate video summaries of your sources (uses Veo).
            </p>

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/video/estimate"
              description="Get cost estimate for video generation"
              requestBody={`{"style": "explainer", "source_ids": ["source-uuid-1"]}`}
              responseExample={`{
  "data": {
    "estimated_duration_seconds": 60,
    "estimated_cost_usd": 6.00,
    "style": "explainer",
    "style_name": "Explainer"
  }
}`}
              notes="Styles: documentary, explainer, presentation"
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/video"
              description="Generate video overview"
              requestBody={`{"style": "explainer", "source_ids": ["source-uuid-1"]}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/video"
              description="List all video overviews"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/video/{video_id}"
              description="Get video overview status"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/video/{video_id}/download"
              description="Get signed download URL"
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/video/{video_id}"
              description="Delete video overview"
            />
          </Section>

          {/* Research */}
          <Section id="research" title="Deep Research">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Start deep research tasks that search the web and generate comprehensive reports.
            </p>

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/research"
              description="Start a deep research task"
              requestBody={`{"query": "Latest developments in quantum computing", "mode": "deep"}`}
              responseExample={`{
  "data": {
    "id": "research-uuid",
    "query": "Latest developments in quantum computing",
    "mode": "deep",
    "status": "completed",
    "sources_found_count": 15,
    "sources_analyzed_count": 15,
    "report_content": "# Research Report\\n\\n## Executive Summary...",
    "report_citations": [
      {"title": "Source 1", "url": "https://example.com"}
    ],
    "cost_usd": 0.25
  }
}`}
              notes="Modes: fast (quick overview), deep (comprehensive analysis)"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/research"
              description="List all research tasks"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/research/{task_id}"
              description="Get research task status and report"
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/research/{task_id}/add-to-notebook"
              description="Add research results as a source"
              notes="Adds the research report as a text source to the notebook for use in chat"
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/research/{task_id}"
              description="Delete research task"
            />
          </Section>

          {/* Study */}
          <Section id="study" title="Study Materials">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Generate flashcards, quizzes, study guides, and FAQs from your sources.
            </p>

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/flashcards"
              description="Generate flashcards"
              requestBody={`{"source_ids": ["source-uuid-1"], "count": 15, "model": "gemini-2.0-flash"}`}
              responseExample={`{
  "data": {
    "flashcards": [
      {"question": "What is X?", "answer": "X is..."},
      {"question": "How does Y work?", "answer": "Y works by..."}
    ]
  },
  "usage": {"cost_usd": 0.002}
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/quiz"
              description="Generate a quiz"
              requestBody={`{"source_ids": ["source-uuid-1"], "question_count": 10, "model": "gemini-2.0-flash"}`}
              responseExample={`{
  "data": {
    "questions": [
      {
        "question": "Which of the following is true?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_index": 1,
        "explanation": "Option B is correct because..."
      }
    ]
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/study-guide"
              description="Generate a study guide"
              requestBody={`{"source_ids": ["source-uuid-1"], "model": "gemini-2.0-flash"}`}
              responseExample={`{
  "data": {
    "title": "Study Guide: Topic Name",
    "summary": "Overview of the topic...",
    "key_concepts": [
      {"term": "Concept 1", "definition": "..."}
    ],
    "glossary": [
      {"term": "Term 1", "definition": "..."}
    ],
    "review_questions": [
      "What is the significance of X?",
      "How does Y relate to Z?"
    ]
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/faq"
              description="Generate FAQ"
              requestBody={`{"source_ids": ["source-uuid-1"], "count": 10, "model": "gemini-2.0-flash"}`}
              responseExample={`{
  "data": {
    "faqs": [
      {"question": "What is X?", "answer": "X is..."},
      {"question": "Why is Y important?", "answer": "Y is important because..."}
    ]
  }
}`}
            />
          </Section>

          {/* Notes */}
          <Section id="notes" title="Notes">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Create and manage notes within a notebook. You can also save chat responses as notes.
            </p>

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/notes"
              description="List all notes"
              responseExample={`{
  "data": [
    {
      "id": "note-uuid",
      "type": "written",
      "title": "Key Insights",
      "content": "Note content...",
      "tags": ["important", "review"],
      "is_pinned": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/notes"
              description="Create a note"
              requestBody={`{"title": "My Note", "content": "Note content here...", "tags": ["important"]}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/notes/save-response"
              description="Save a chat response as a note"
              requestBody={`{"message_id": "chat-message-uuid"}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/notes/{note_id}"
              description="Get a specific note"
            />

            <Endpoint
              method="PATCH"
              path="/api/v1/notebooks/{notebook_id}/notes/{note_id}"
              description="Update a note"
              requestBody={`{"title": "Updated Title", "content": "Updated content", "is_pinned": true}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/notes/{note_id}"
              description="Delete a note"
            />
          </Section>

          {/* Studio */}
          <Section id="studio" title="Studio Outputs">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Generate structured outputs: data tables, reports, slide decks, and infographics.
            </p>

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/studio/outputs"
              description="List all studio outputs"
              notes="Optional query param: ?type=data_table|report|slide_deck|infographic"
            />

            <Endpoint
              method="GET"
              path="/api/v1/notebooks/{notebook_id}/studio/outputs/{output_id}"
              description="Get a specific studio output"
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/notebooks/{notebook_id}/studio/outputs/{output_id}"
              description="Delete a studio output"
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/studio/data-table"
              description="Generate a data table"
              requestBody={`{
  "source_ids": ["source-uuid-1"],
  "custom_instructions": "Extract all dates and events mentioned",
  "model": "gemini-2.0-flash"
}`}
              responseExample={`{
  "data": {
    "id": "output-uuid",
    "content": {
      "title": "Timeline of Events",
      "columns": [
        {"header": "Date", "key": "date", "type": "date"},
        {"header": "Event", "key": "event", "type": "text"}
      ],
      "rows": [
        {"date": "2024-01-15", "event": "Project started"},
        {"date": "2024-03-20", "event": "Phase 1 completed"}
      ]
    }
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/studio/report"
              description="Generate a briefing document"
              requestBody={`{
  "source_ids": ["source-uuid-1"],
  "custom_instructions": "Focus on financial implications",
  "model": "gemini-2.0-flash"
}`}
              responseExample={`{
  "data": {
    "id": "output-uuid",
    "content": {
      "title": "Financial Analysis Report",
      "executive_summary": "...",
      "sections": [
        {"title": "Introduction", "content": "...", "order": 1}
      ],
      "key_findings": ["Finding 1", "Finding 2"],
      "conclusion": "..."
    }
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/studio/slide-deck"
              description="Generate a presentation"
              requestBody={`{
  "source_ids": ["source-uuid-1"],
  "slide_count": 10,
  "custom_instructions": "Make it suitable for executives",
  "model": "gemini-2.0-flash"
}`}
              responseExample={`{
  "data": {
    "id": "output-uuid",
    "content": {
      "title": "Executive Presentation",
      "subtitle": "Q4 2024 Overview",
      "slides": [
        {
          "title": "Slide 1",
          "content": "...",
          "notes": "Speaker notes...",
          "layout": "title_content",
          "order": 1
        }
      ]
    }
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/notebooks/{notebook_id}/studio/infographic"
              description="Generate an infographic plan"
              requestBody={`{
  "source_ids": ["source-uuid-1"],
  "style": "modern",
  "custom_instructions": "Highlight the top 5 statistics",
  "model": "gemini-2.0-flash"
}`}
              notes="Styles: modern, minimal, bold, infographic"
            />
          </Section>

          {/* API Key Management */}
          <Section id="api-keys" title="API Key Management">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Manage your API keys. These endpoints require JWT authentication (not API key).
            </p>

            <div className="mb-6 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
              <h4 className="mb-2 font-medium text-[var(--accent-primary)]">Note</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                API key management endpoints require JWT authentication (Bearer token) and cannot be
                accessed with an API key. This prevents API keys from being used to create or modify
                other API keys.
              </p>
            </div>

            <Endpoint
              method="POST"
              path="/api/v1/api-keys"
              description="Create a new API key"
              requestBody={`{
  "name": "Production API Key",
  "scopes": ["*"],
  "rate_limit_rpm": 60,
  "rate_limit_rpd": 10000,
  "expires_at": "2025-12-31T23:59:59Z",
  "description": "Key for production automation"
}`}
              responseExample={`{
  "data": {
    "id": "key-uuid",
    "name": "Production API Key",
    "key": "nb_live_abc123...",
    "key_prefix": "nb_live_abc1...",
    "scopes": ["*"],
    "rate_limit_rpm": 60,
    "rate_limit_rpd": 10000,
    "is_active": true
  }
}`}
              notes="The full key is only returned once during creation. Store it securely!"
            />

            <Endpoint method="GET" path="/api/v1/api-keys" description="List all your API keys" />

            <Endpoint
              method="GET"
              path="/api/v1/api-keys/{key_id}"
              description="Get API key details"
            />

            <Endpoint
              method="PATCH"
              path="/api/v1/api-keys/{key_id}"
              description="Update API key settings"
              requestBody={`{"name": "New Name", "is_active": false, "rate_limit_rpm": 30}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/api-keys/{key_id}"
              description="Revoke (delete) an API key"
            />

            <Endpoint
              method="GET"
              path="/api/v1/api-keys/{key_id}/usage"
              description="Get usage statistics for an API key"
              responseExample={`{
  "data": {
    "total_requests": 1500,
    "total_tokens_in": 250000,
    "total_tokens_out": 75000,
    "total_cost_usd": 2.50,
    "requests_today": 45,
    "rate_limit_rpm": 60,
    "rate_limit_rpd": 10000,
    "last_used_at": "2025-01-15T10:00:00Z"
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/api-keys/{key_id}/rotate"
              description="Rotate an API key"
              notes="Generates a new key secret while keeping the same key ID and settings. The old key becomes invalid immediately."
              responseExample={`{
  "data": {
    "id": "key-uuid",
    "key": "nb_live_newkey123...",
    "key_prefix": "nb_live_newk..."
  }
}`}
            />
          </Section>

          {/* Footer */}
          <div className="mt-16 border-t border-[var(--border)] pt-8 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              Need help? Check the{' '}
              <Link href="/settings" className="text-[var(--accent-primary)] hover:underline">
                Settings page
              </Link>{' '}
              to create and manage your API keys.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

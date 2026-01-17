import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Types for our database
export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  emoji: string;
  settings: Record<string, unknown>;
  file_search_store_id: string | null;
  source_count: number;
  is_featured?: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  notebook_id: string;
  type: 'pdf' | 'docx' | 'txt' | 'youtube' | 'url' | 'audio' | 'text';
  name: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  file_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  token_count: number | null;
  metadata: Record<string, unknown>;
  source_guide: {
    summary?: string;
    topics?: string[];
    suggested_questions?: string[];
  } | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  notebook_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  source_ids_used: string[];
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
}

export interface Citation {
  number: number;
  source_id: string;
  source_name: string;
  text: string;
  file_path?: string | null;
  confidence: number;
}

export interface AudioOverview {
  id: string;
  notebook_id: string;
  format: 'deep_dive' | 'brief' | 'critique' | 'debate';
  status: string;
  progress_percent: number;
  custom_instructions: string | null;
  source_ids: string[];
  script: string | null;
  audio_file_path: string | null;
  duration_seconds: number | null;
  model_used: string | null;
  cost_usd: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Note {
  id: string;
  notebook_id: string;
  type: 'written' | 'saved_response';
  title: string | null;
  content: string | null;
  tags: string[];
  is_pinned: boolean;
  original_message_id: string | null;
  created_at: string;
  updated_at: string;
}

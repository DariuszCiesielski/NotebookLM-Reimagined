export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
  description: string | null;
  allowed_ips: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key - only returned on creation/rotation
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  rate_limit_rpm?: number;
  rate_limit_rpd?: number;
  expires_at?: string;
  description?: string;
  allowed_ips?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: string[];
  rate_limit_rpm?: number;
  rate_limit_rpd?: number;
  is_active?: boolean;
  expires_at?: string;
  description?: string;
  allowed_ips?: string[];
}

export interface ApiKeyUsageStats {
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  requests_today: number;
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  last_used_at: string | null;
}

export const API_KEY_SCOPES = [
  { value: '*', label: 'Full Access', description: 'Access to all operations' },
  { value: 'read', label: 'Read Only', description: 'Can only read data, no modifications' },
  { value: 'notebooks', label: 'Notebooks', description: 'Manage notebooks' },
  { value: 'sources', label: 'Sources', description: 'Upload and manage sources' },
  { value: 'chat', label: 'Chat', description: 'Send chat messages' },
  { value: 'audio', label: 'Audio', description: 'Generate audio overviews' },
  { value: 'video', label: 'Video', description: 'Generate video content' },
  { value: 'research', label: 'Research', description: 'Run deep research tasks' },
  { value: 'study', label: 'Study', description: 'Generate study materials' },
  { value: 'notes', label: 'Notes', description: 'Manage notes' },
] as const;

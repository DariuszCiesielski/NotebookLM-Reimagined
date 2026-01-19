-- ============================================================================
-- RAG Implementation - Enable pgvector and create source_chunks table
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create source_chunks table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),  -- text-embedding-004 outputs 768 dimensions
  token_count INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_source_chunks_source_id ON source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_source_chunks_embedding ON source_chunks USING hnsw (embedding vector_cosine_ops);

-- 4. Enable RLS
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy - Users can access chunks of sources they own (via notebooks)
CREATE POLICY "Users can view their source chunks" ON source_chunks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sources s
    JOIN notebooks n ON s.notebook_id = n.id
    WHERE s.id = source_chunks.source_id
    AND n.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their source chunks" ON source_chunks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sources s
    JOIN notebooks n ON s.notebook_id = n.id
    WHERE s.id = source_chunks.source_id
    AND n.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their source chunks" ON source_chunks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM sources s
    JOIN notebooks n ON s.notebook_id = n.id
    WHERE s.id = source_chunks.source_id
    AND n.user_id = auth.uid()
  )
);

-- 6. Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_source_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  p_notebook_id UUID DEFAULT NULL,
  p_source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.source_id,
    sc.chunk_index,
    sc.content,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM source_chunks sc
  JOIN sources s ON sc.source_id = s.id
  WHERE
    (p_notebook_id IS NULL OR s.notebook_id = p_notebook_id)
    AND (p_source_ids IS NULL OR s.id = ANY(p_source_ids))
    AND sc.embedding IS NOT NULL
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Grant execute permission
GRANT EXECUTE ON FUNCTION match_source_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_source_chunks TO service_role;

-- Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base used for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embeddings VECTOR(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets logged when no KB answer is found
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  user_email TEXT NOT NULL,
  issue_summary TEXT NOT NULL,
  chat_context TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  solution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Threaded ticket responses from admins
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  responder TEXT NOT NULL DEFAULT 'admin',
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at DESC);

-- RPC for semantic search
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  similarity FLOAT
) AS $$
  SELECT
    kb.id,
    kb.question,
    kb.answer,
    1 - (kb.embeddings <#> query_embedding) AS similarity
  FROM knowledge_base AS kb
  WHERE 1 - (kb.embeddings <#> query_embedding) >= similarity_threshold
  ORDER BY kb.embeddings <#> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

-- Basic RLS scaffolding (tighten for production)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow authenticated read" ON knowledge_base
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow service role write kb" ON knowledge_base
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow authenticated read tickets" ON tickets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow service role write tickets" ON tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow service role write responses" ON ticket_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

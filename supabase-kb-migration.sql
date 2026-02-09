-- =====================================================
-- Multi-Tier Support System - Knowledge Base Setup
-- =====================================================
-- This migration sets up the knowledge base table with 
-- semantic search using pgvector extension
-- =====================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embeddings vector(768), -- 768 dimensions for text-embedding-ada-002
    source TEXT DEFAULT 'admin', -- 'admin' or 'csv'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embeddings_idx 
ON public.knowledge_base 
USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Semantic Search Function
-- =====================================================
-- Searches knowledge base using vector similarity
-- Returns top matches above similarity threshold
-- =====================================================

CREATE OR REPLACE FUNCTION public.match_knowledge_base(
    query_embedding vector(768),
    similarity_threshold float DEFAULT 0.75,
    match_count int DEFAULT 3
)
RETURNS TABLE (
    id uuid,
    question text,
    answer text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.question,
        kb.answer,
        1 - (kb.embeddings <=> query_embedding) AS similarity
    FROM public.knowledge_base kb
    WHERE kb.embeddings IS NOT NULL
        AND 1 - (kb.embeddings <=> query_embedding) > similarity_threshold
    ORDER BY kb.embeddings <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- Ensure tickets table exists and has correct schema
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL,
    issue_summary TEXT NOT NULL,
    conversation_history JSONB,
    admin_solution TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add conversation_history column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'conversation_history'
    ) THEN
        ALTER TABLE public.tickets ADD COLUMN conversation_history JSONB;
    END IF;
END $$;

-- Add admin_solution column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'admin_solution'
    ) THEN
        ALTER TABLE public.tickets ADD COLUMN admin_solution TEXT;
    END IF;
END $$;

-- Create updated_at trigger for tickets
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Enable Row Level Security (optional but recommended)
-- =====================================================

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything
CREATE POLICY "Service role can do everything on knowledge_base"
ON public.knowledge_base
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on tickets"
ON public.tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to read knowledge base
CREATE POLICY "Authenticated users can read knowledge_base"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.knowledge_base TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.tickets TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_base TO service_role;

-- =====================================================
-- Sample data (optional - for testing)
-- =====================================================

-- You can add sample KB entries here for testing
-- Note: You'll need to generate embeddings for these in your app

INSERT INTO public.knowledge_base (question, answer, source)
VALUES 
    ('Outlook not working or crashing', 
     E'1. Restart Outlook\n2. Run Outlook in Safe Mode (outlook.exe /safe)\n3. Repair your Outlook profile\n4. Update Windows and Office\n5. Repair Office from Control Panel\n6. Check storage and internet connection',
     'admin'),
    ('Printer paper jam issue',
     E'1. Turn off the printer\n2. Open all printer doors and remove jammed paper carefully\n3. Check for torn pieces of paper\n4. Close all doors and restart printer\n5. Run a test print',
     'admin'),
    ('WiFi connection problems',
     E'1. Restart your device\n2. Turn WiFi off and on\n3. Forget network and reconnect\n4. Check if other devices can connect\n5. Restart the router\n6. Update network drivers',
     'admin')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('knowledge_base', 'tickets');

-- Check if function was created
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'match_knowledge_base';

-- Check sample data
-- SELECT id, question, created_at FROM public.knowledge_base;

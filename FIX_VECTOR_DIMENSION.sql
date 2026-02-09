-- Run this in your Supabase SQL Editor to fix the "different vector dimensions" error

-- 1. Drop the existing function
DROP FUNCTION IF EXISTS public.match_knowledge_base(vector, float, int);

-- 2. Update the table column to use 384 dimensions (matches Xenova/all-MiniLM-L6-v2)
ALTER TABLE public.knowledge_base 
ALTER COLUMN embeddings TYPE vector(384);

-- 3. Recreate the index for 384 dimensions
DROP INDEX IF EXISTS knowledge_base_embeddings_idx;
CREATE INDEX knowledge_base_embeddings_idx 
ON public.knowledge_base 
USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);

-- 4. Recreate the search function with correct dimensions (384)
CREATE OR REPLACE FUNCTION public.match_knowledge_base(
    query_embedding vector(384),
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

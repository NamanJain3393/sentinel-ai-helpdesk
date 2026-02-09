-- Run this in Supabase SQL Editor to fix the "Could not find table ticket_responses" error

-- 1. Create the ticket_responses table
CREATE TABLE IF NOT EXISTS public.ticket_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    responder TEXT DEFAULT 'admin',
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Allow service role (admin) to do everything
CREATE POLICY "Service role can do everything on ticket_responses"
ON public.ticket_responses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Allow public read access (so users can see responses)
CREATE POLICY "Allow public to read ticket_responses"
ON public.ticket_responses
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.ticket_responses TO service_role;
GRANT SELECT ON public.ticket_responses TO anon;
GRANT SELECT ON public.ticket_responses TO authenticated;

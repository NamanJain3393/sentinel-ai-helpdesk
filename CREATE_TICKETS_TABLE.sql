-- Run this in your Supabase SQL Editor to create the 'tickets' table

-- 1. Create the tickets table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Allow service role (server) to do everything
-- This is required for the API to insert tickets
CREATE POLICY "Service role can do everything on tickets"
ON public.tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Grant permissions to service_role
GRANT SELECT, INSERT, UPDATE ON public.tickets TO service_role;

-- 5. Create updated_at trigger (optional but good practice)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

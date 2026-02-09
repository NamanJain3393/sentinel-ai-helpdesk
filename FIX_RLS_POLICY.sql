-- Run this in Supabase SQL Editor to fix the "Failed to create ticket" error

-- 1. Ensure the 'conversation_history' column exists (in case you have an old table version)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS conversation_history JSONB;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS admin_solution TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS issue_summary TEXT;

-- 2. Allow PUBLIC (anon) users to create tickets
-- This is necessary if you are using the 'anon' key instead of the 'service_role' key
DROP POLICY IF EXISTS "Allow public to create tickets" ON public.tickets;
CREATE POLICY "Allow public to create tickets"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Allow PUBLIC to read their own tickets (optional, based on email matches?)
-- For now, we just ensure they can insert.

-- 4. Grant permissions to anon role
GRANT INSERT ON public.tickets TO anon;
GRANT INSERT ON public.tickets TO authenticated;
GRANT SELECT ON public.tickets TO anon; -- Needed to return the created ticket data
GRANT SELECT ON public.tickets TO authenticated;

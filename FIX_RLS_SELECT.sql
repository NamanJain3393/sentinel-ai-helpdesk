-- Run this in Supabase SQL Editor to fix the "Empty Error" issue

-- The error happens because after creating the ticket, the app tries to READ it back.
-- But we only gave permission to INSERT, not to SELECT (Read).
-- Since you are likely using the Public (Anon) key, we need to allow reading.

-- 1. Allow PUBLIC to read tickets
-- (Note: In a real app, you might want to restrict this, but for now this fixes the error)
CREATE POLICY "Allow public to read tickets"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Ensure permissions are granted
GRANT SELECT ON public.tickets TO anon;
GRANT SELECT ON public.tickets TO authenticated;

# Supabase Knowledge Base Setup Guide

This guide will help you enable semantic search for your knowledge base using pgvector.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Run the Migration

1. Open the file: `supabase-kb-migration.sql` (in your project root)
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

## Step 3: Verify Installation

Run these queries to confirm everything is set up:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('knowledge_base', 'tickets');

-- Check if function exists  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'match_knowledge_base';

-- View sample knowledge base entries
SELECT id, question, source, created_at FROM public.knowledge_base;
```

You should see:
- ✅ Both tables listed
- ✅ `match_knowledge_base` function listed
- ✅ 3 sample KB entries

## Step 4: Test the System

1. Restart your Next.js dev server (Ctrl+C, then `npm run dev`)
2. Go to `http://localhost:3000/chatbot`
3. Type: **"outlook not working"**
4. Reply: **"still not working"**
5. ✅ You should see KB search working (no more "KB search failed" in console)

## What This Migration Does

- **Enables pgvector extension** for semantic similarity search
- **Creates `knowledge_base` table** with embeddings column
- **Creates `match_knowledge_base()` function** for intelligent search
- **Updates `tickets` table** to store conversation history
- **Adds sample data** (3 common IT issues for testing)
- **Sets up RLS policies** for security
- **Creates indexes** for faster search

## Important Notes

- **Embeddings**: The system will automatically generate embeddings when admins add solutions
- **Vector dimension**: Using 768 dimensions (standard for many embedding models)
- **Similarity threshold**: Set to 0.75 (75% match required)
- **Sample data**: Includes Outlook, printer, and WiFi issues - these don't have embeddings yet, so add your own test data or wait for admin submissions

## Troubleshooting

**Error: "extension vector does not exist"**
- pgvector might not be enabled on your Supabase instance
- Go to Database → Extensions → Enable "vector"

**Error: "permission denied"**
- Make sure you're running as a superuser or service role
- Check that SUPABASE_SERVICE_ROLE_KEY is set in `.env.local`

**KB search still failing**
- Check console for specific error messages
- Verify function was created: `SELECT * FROM pg_proc WHERE proname = 'match_knowledge_base';`
- Restart your dev server

## Next: Phase 2

Once this is working, Phase 2 will enable:
- Admin dashboard to resolve tickets
- Auto-add solutions to KB
- Solutions become immediately searchable

Need help? Check the error messages in your console!

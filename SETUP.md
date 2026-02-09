# 🚀 Setup Guide - Industrial Helpdesk System

## Prerequisites

✅ Next.js 14+ project  
✅ Node.js 18+  
✅ All dependencies installed (`npm install`)

## Required Environment Variables

Create a `.env.local` file in the root directory with:

```bash
# OpenAI API (REQUIRED for chatbot)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase (OPTIONAL - for logging chat history and unresolved issues)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Optional - for production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup (Supabase - Optional)

If you want to use Supabase for logging:

1. **Create tables in Supabase SQL Editor:**

```sql
-- Chat history table (optional)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unresolved issues are logged to existing 'issues' table
-- (already created in previous setup)
```

## File Structure Required

Ensure these files exist:

```
/data/Monthly_Report.csv  ← Your CSV ticket data
```

## Running the Application

1. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Home: http://localhost:3000
   - Analytics: http://localhost:3000/analytics
   - Chatbot: http://localhost:3000/chatbot
   - Admin: http://localhost:3000/admin

## Features Status

✅ **Analytics Dashboard** (`/analytics`)
   - Top Talkers, MTTR, MTBR, CSAT/DSAT
   - Top 10 Problems & Solutions
   - Interactive charts with filters

✅ **AI Chatbot** (`/chatbot`)
   - OpenAI GPT-4o-mini powered
   - Semantic search over CSV using embeddings
   - Clarifying questions for better context
   - Auto-logs unresolved issues

✅ **Admin Dashboard** (`/admin`)
   - Lists unresolved issues from Supabase
   - View and manage open tickets

✅ **Cron Endpoint** (`/api/cron/ingest`)
   - Auto-ingest CSV data (setup Vercel Cron for hourly)

## Notes

- **Chatbot will work** even without Supabase (logging will silently fail)
- **Admin page** requires Supabase to show real unresolved issues
- **CSV file** must exist at `/data/Monthly_Report.csv` for chatbot search
- **OpenAI API key** is REQUIRED for chatbot functionality

## Troubleshooting

- **Chatbot not responding**: Check `OPENAI_API_KEY` in `.env.local`
- **Admin page empty**: Supabase may not be configured or `issues` table missing
- **CSV not loading**: Verify file exists at `data/Monthly_Report.csv`
- **Embeddings slow**: First 500 rows are embedded on-the-fly (optimize later with caching)


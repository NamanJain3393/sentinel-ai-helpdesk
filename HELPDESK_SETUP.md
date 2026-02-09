# 🚀 Helpdesk Copilot - Setup Guide

## Overview

A next-generation AI-powered helpdesk system with:
- 💬 ChatGPT-like streaming chatbot with pause/resume
- 🧾 Automatic ticket escalation
- 🧑‍💼 Admin dashboard for ticket management
- 📚 Auto-learning knowledge base

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- OpenAI API key

## Setup Steps

### 1. Environment Variables

Create `.env.local`:

```bash
# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-your-key-here

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy contents from supabase-schema.sql
# Paste into Supabase Dashboard > SQL Editor > New Query
# Execute
```

This creates:
- `chat_sessions` - Chat session tracking
- `chat_messages` - Individual messages
- `tickets` - Support tickets
- `solutions` - Knowledge base

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit:
- **Chatbot**: http://localhost:3000/chatbot
- **Admin Dashboard**: http://localhost:3000/admin

## Features

### 💬 Chatbot (`/chatbot`)

- **Streaming responses** - Word-by-word like ChatGPT
- **Pause/Resume** - Control streaming
- **Chat history** - Sidebar with past sessions
- **Semantic search** - Finds solutions using embeddings
- **Confidence scores** - Shows match confidence
- **Raise ticket** - Escalates unresolved issues

### 🧾 Ticket System

- **Auto-escalation** - Creates tickets when no solution found
- **Chat context** - Includes conversation history
- **Status tracking** - Open → In Progress → Resolved

### 🧑‍💼 Admin Dashboard (`/admin`)

- **Open Tickets** - View and resolve issues
- **Resolved Tickets** - History of resolved issues
- **Knowledge Base** - All solutions (auto-updates when tickets resolved)
- **Add Solutions** - Manually add to knowledge base

## API Routes

- `POST /api/chatbot/stream` - Streaming chat endpoint
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List tickets
- `PATCH /api/tickets/[id]` - Update ticket (resolve)
- `GET /api/chat_history` - Get chat sessions/messages
- `GET /api/solutions` - List solutions
- `POST /api/solutions` - Add solution

## How It Works

1. **User asks question** → Chatbot searches knowledge base using embeddings
2. **If solution found** → Shows with confidence score, asks if resolved
3. **If no solution** → Offers to raise ticket
4. **Admin resolves ticket** → Solution automatically added to knowledge base
5. **Future users** → Can now find the solution automatically

## Troubleshooting

### Chatbot not streaming?
- Check OpenAI API key is valid
- Verify quota/billing on OpenAI dashboard

### Supabase errors?
- Ensure tables are created (run schema SQL)
- Check RLS policies allow access
- Verify environment variables

### Embeddings quota exceeded?
- System falls back to keyword search automatically
- Check OpenAI usage dashboard

## Production Deployment

1. **Vercel** (recommended):
   ```bash
   vercel --prod
   ```
   Add environment variables in Vercel dashboard

2. **Update Supabase RLS**:
   - Remove public access policies
   - Add proper auth-based policies
   - Use service role key server-side only

3. **Enable CORS** if needed for API routes

## Next Steps

- Add user authentication (Supabase Auth)
- Email notifications for new tickets
- File upload support
- Weekly summary reports
- Analytics dashboard


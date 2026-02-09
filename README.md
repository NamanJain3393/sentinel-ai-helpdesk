# 🤖 Next-Generation Helpdesk Copilot

A production-ready AI-powered helpdesk system built with Next.js 14, TypeScript, Supabase, and OpenAI.

## ✨ Features

### 💬 ChatGPT-Like Assistant
- **Streaming responses** - Real-time word-by-word streaming
- **Pause/Resume** - Control streaming mid-response
- **Chat history** - Persistent sessions with sidebar navigation
- **Semantic search** - AI-powered solution matching using embeddings
- **Confidence scores** - Shows match confidence (e.g., "93% confidence")
- **Markdown support** - Rich formatting for code blocks and lists

### 🧾 Ticket Escalation
- **Auto-escalation** - Creates tickets when no solution found
- **Chat context** - Includes full conversation history
- **Ticket tracking** - Status: Open → In Progress → Resolved
- **Email notifications** - Ready for integration

### 🧑‍💼 Admin Dashboard
- **Open Tickets** - View and manage unresolved issues
- **Resolved History** - Track all resolved tickets
- **Knowledge Base** - Auto-updating solutions database
- **Add Solutions** - Manually enrich knowledge base

### 📊 Analytics Dashboard (Power BI/Tableau Level)
- **KPI Cards** - Total Tickets, Open Tickets, MTTR, MTBR, Avg CSAT, %SLA Breaches
- **Interactive Filters** - Date range, Department, Category, Priority (persisted in URL)
- **Time Series Charts** - Ticket volume with smoothing & granularity (day/week/month)
- **Top 10 Problems & Solutions** - Horizontal bar charts with drill-down capability
- **Department Breakdown** - Treemap visualization
- **SLA Breach Analysis** - Donut chart for compliance tracking
- **Ticket Age Histogram** - Distribution analysis
- **Heatmap** - Top Talkers vs Departments (repeater analysis)
- **Correlation Matrix** - Numeric field relationships
- **Interactive Ticket Table** - Paginated, sortable, searchable with detail pane
- **AI Insights** - Natural-language summary with anomaly detection and recommendations
- **Export Functions** - CSV and PDF export

## 🚀 Quick Start

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (`.env.local`):
   ```bash
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_URL=https://...
   SUPABASE_KEY=...
   ```

3. **Set up Supabase**:
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Creates all required tables

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Access**:
   - Chatbot: http://localhost:3000/chatbot
   - Admin: http://localhost:3000/admin
   - Analytics: http://localhost:3000/analytics

## 📁 Project Structure

```
/app
  /api
    /chatbot/stream/route.ts    # Streaming chat endpoint
    /tickets/route.ts            # Ticket CRUD
    /solutions/route.ts          # Knowledge base
    /chat_history/route.ts       # Chat sessions
    /metrics/route.ts            # Analytics metrics API
    /ai/insights/route.ts        # AI insights generation
  /chatbot/page.tsx              # Chatbot UI
  /admin/page.tsx                # Admin dashboard
  /analytics/page.tsx            # Analytics dashboard
/components
  /chat
    ChatContainer.tsx            # Main chat component
    MessageBubble.tsx            # Message display
    ChatSidebar.tsx              # History sidebar
    LoaderDots.tsx               # Typing indicator
  /analytics
    KpiCard.tsx                  # KPI card component
    TimeSeriesChart.tsx          # Time series chart with granularity
    TicketTable.tsx              # Interactive ticket table
    Top10IssuesChart.tsx         # Top issues chart with drill-down
/lib
  supabase.ts                    # Supabase client
  embeddings.ts                  # OpenAI embeddings
  analytics.ts                   # Analytics utilities
```

## 🎯 How It Works

1. **User asks question** → Chatbot searches knowledge base using semantic embeddings
2. **Solution found** → Shows with confidence score, asks if resolved
3. **No solution** → Offers to raise ticket automatically
4. **Admin resolves** → Solution added to knowledge base automatically
5. **Future users** → Can now find the solution via AI search

## 🔧 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN UI
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI (GPT-4o-mini, text-embedding-3-small)
- **Streaming**: ReadableStream API
- **Markdown**: react-markdown

## 📊 Analytics Dashboard

The analytics dashboard provides Power BI/Tableau-level insights for your support operations.

### Features

- **Real-time Metrics**: KPIs computed from `data/Monthly_Report.csv` with in-memory caching
- **Interactive Filters**: All filters persist in URL query string for sharing/bookmarking
- **Drill-down**: Click any bar in "Top 10 Problems" to filter the entire dashboard
- **AI Insights**: Natural-language summaries with anomaly detection (z-score based)
- **Export**: CSV export for current filter set, PDF snapshot support

### API Endpoints

#### `/api/metrics`
Computes KPIs from CSV data with filter support via query parameters.

**Query Parameters:**
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)
- `department` - Department name
- `category` - Category/Problem name
- `priority` - Priority level

**Response:**
```json
{
  "totalTickets": 1234,
  "openTickets": 45,
  "mttr": 125.5,
  "mtbr": 180.2,
  "csatAvg": 85.3,
  "dsatPct": 14.7,
  "slaBreachCount": 23,
  "slaBreachPercent": 1.9,
  "topProblems": [...],
  "topSolutions": [...]
}
```

**Example:**
```bash
curl "http://localhost:3000/api/metrics?department=IT&from=2024-01-01&to=2024-12-31"
```

#### `/api/ai/insights`
Generates natural-language insights with anomaly detection.

**Query Parameters:** Same as `/api/metrics`

**Response:**
```json
{
  "insights": "📊 Analytics Summary...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Features:**
- Statistical anomaly detection (z-score > 2)
- Top spikes/drops in ticket volume
- Root-cause suggestions
- If `OPENAI_API_KEY` is set, uses GPT-4o-mini to paraphrase findings into executive-friendly language

**Example:**
```bash
curl "http://localhost:3000/api/ai/insights?department=IT"
```

### Environment Variables

For AI Insights enhancement:
```bash
OPENAI_API_KEY=sk-...  # Optional: enables GPT-4o-mini paraphrasing
```

### Data Source

Place your CSV file at:
```
/data/Monthly_Report.csv
```

The system automatically:
- Parses CSV on first request
- Caches parsed data in memory (5-minute TTL)
- Invalidates cache when file changes
- Handles missing/invalid data gracefully

## 📚 Documentation

See `HELPDESK_SETUP.md` for detailed setup instructions.

## 🚢 Deployment

Deploy to Vercel:
```bash
vercel --prod
```

Add environment variables in Vercel dashboard.

## 📝 License

MIT


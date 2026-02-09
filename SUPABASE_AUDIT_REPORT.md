# 🔍 Supabase Configuration Audit Report

**Date:** 2024-01-15  
**Status:** ⚠️ **FAIL** - Multiple Critical Issues Found

---

## Executive Summary

This audit identified **5 critical issues** and **3 configuration inconsistencies** that prevent proper Supabase connectivity. The main problems are:

1. **Inconsistent environment variable usage** across two different client implementations
2. **Client/Server key confusion** - potential security issues
3. **Schema mismatches** between database and TypeScript types
4. **No graceful handling** of missing environment variables in some critical paths
5. **Mixed client usage** causing unpredictable behavior

---

## 1. ENVIRONMENT VARIABLES

### ❌ **ISSUE #1: Inconsistent Variable Names**

**Files Affected:**
- `lib/db.ts` (lines 9-10)
- `lib/supabase.ts` (lines 5-6)
- `app/api/chatbot/stream/route.ts` (lines 29-30)

**Problem:**
The codebase uses **two different Supabase client implementations** with different environment variable requirements:

**Pattern 1** (`lib/db.ts`):
```typescript
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
```

**Pattern 2** (`lib/supabase.ts`):
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
```

**Pattern 3** (`app/api/chatbot/stream/route.ts`):
```typescript
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**Impact:** 
- Different parts of the codebase require different environment variables
- Unclear which variables are actually needed
- Setup confusion for developers

**Recommendation:** Standardize on a single pattern.

---

### ❌ **ISSUE #2: Missing Service Role Key**

**Problem:** 
The codebase uses generic `SUPABASE_KEY` but doesn't distinguish between:
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations, bypasses RLS)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for client-side, respects RLS)

**Security Risk:** 
Server routes should use service role key to bypass RLS, but current code may be using anon key.

**Files Using Server Routes:**
- `app/api/solutions/route.ts` - uses `getSupabaseClient()` from `lib/db.ts`
- `app/api/tickets/route.ts` - uses `getSupabaseClient()` from `lib/db.ts`
- `app/api/tickets/[id]/route.ts` - uses `getSupabaseClient()` from `lib/db.ts`

---

### ✅ **FIX #1: Standardize Environment Variables**

**Recommended `.env.local` format:**

```bash
# ============================================
# Supabase Configuration
# ============================================

# Public keys (safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-only keys (NEVER expose to client)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Legacy support (optional, will be deprecated)
# SUPABASE_KEY=your-service-role-key-here
# SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 2. SUPABASE INITIALIZATION

### ❌ **ISSUE #3: Dual Client Implementation**

**Files:**
- `lib/db.ts` - Server-only client
- `lib/supabase.ts` - Client/server mixed client

**Problem:**
Two different client implementations cause confusion:

1. **`lib/db.ts`** - Throws error if env vars missing (lines 12-14)
2. **`lib/supabase.ts`** - Also throws error, but with different fallback logic

**Usage Map:**
- `lib/db.ts` → Used by: `app/api/solutions/route.ts`, `app/api/tickets/route.ts`, `app/api/tickets/[id]/route.ts`, `app/api/chat_history/route.ts`
- `lib/supabase.ts` → Used by: `lib/knowledge-base.ts` (line 109)
- `app/api/chatbot/stream/route.ts` → Uses `lib/db.ts` but has custom fallback logic

---

### ❌ **ISSUE #4: Server Code Using Client Variables**

**File:** `lib/supabase.ts` (lines 5-6)

**Problem:**
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
```

This file is imported in server contexts (`lib/knowledge-base.ts`) but tries to use `NEXT_PUBLIC_*` variables, which are meant for client-side code.

**Impact:** 
- Incorrect variable precedence
- May accidentally use anon key in server routes

---

### ✅ **FIX #2: Unify Client Implementation**

**Create single source of truth for Supabase clients.**

---

## 3. NETWORK / FETCH FAILURES

### ✅ **GOOD: Graceful Fallback Implemented**

**Files with Fallback:**
- `app/api/tickets/route.ts` - Falls back to `tickets.json`
- `app/api/tickets/[id]/route.ts` - Falls back to `tickets.json`
- `app/api/chat_history/route.ts` - Returns empty arrays
- `app/api/solutions/route.ts` - Returns empty array (after our recent fix)
- `app/api/chatbot/stream/route.ts` - Uses in-memory sessions

**No explicit fetch error handling found** - Supabase client handles this internally.

---

## 4. FALLBACK BEHAVIOR

### ✅ **Fallback Conditions Documented**

**When JSON fallback triggers:**

1. **Missing Environment Variables:**
   - `lib/db.ts` throws error → caught in API routes → fallback to JSON

2. **Supabase Connection Failure:**
   - Any Supabase query error → caught → fallback to JSON

3. **Table Not Found:**
   - Error code `PGRST116` → fallback to JSON

**Files with JSON Fallback:**
- `app/api/tickets/route.ts` (lines 98-105, 149-166)
- `app/api/tickets/[id]/route.ts` (lines 75-95, 174-185)

**Fallback Pattern:**
```typescript
try {
  const supabase = getSupabaseClient();
  // ... Supabase operations
} catch (supabaseError: any) {
  console.warn("Supabase unavailable, using tickets.json:", supabaseError);
  // ... Use JSON file
}
```

---

## 5. SCHEMA MISMATCHES

### ❌ **ISSUE #5: Solutions Table Schema Mismatch**

**Database Schema** (`supabase-schema.sql` line 37-44):
```sql
CREATE TABLE IF NOT EXISTS solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  solution TEXT NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**TypeScript Interface** (`lib/db.ts` lines 40-46):
```typescript
export interface Solution {
  id: number;  // ❌ Should be string (UUID)
  issue_type: string;  // ❌ Table has 'question', not 'issue_type'
  model: string;  // ❌ Table doesn't have 'model'
  solution_text: string;  // ❌ Table has 'solution', not 'solution_text'
  created_at: string;
}
```

**TypeScript Interface** (`lib/supabase.ts` lines 44-51):
```typescript
export interface Solution {
  id: string;  // ✅ Correct
  question: string;  // ✅ Correct
  solution: string;  // ✅ Correct
  confidence?: number;  // ✅ Correct
  created_at: string;  // ✅ Correct
  updated_at?: string;  // ✅ Correct
}
```

**Impact:**
- `lib/db.ts` Solution interface doesn't match database
- `upsertSolution()` in `lib/db.ts` tries to use `issue_type,model` constraint that doesn't exist
- `app/api/admin/solutions/route.ts` uses `lib/db.ts` types but database expects `question/solution`

---

## 6. AUTO-FIXES REQUIRED

### 🔧 **FIX #3: Fix `lib/db.ts` - Use Service Role Key**

**File:** `lib/db.ts`

```typescript
export function getSupabaseClient(): SupabaseClient {
  if (supabaseSingleton) return supabaseSingleton;

  const url = process.env.SUPABASE_URL;
  // Use service role key for server operations
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  supabaseSingleton = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return supabaseSingleton;
}
```

---

### 🔧 **FIX #4: Fix `lib/supabase.ts` - Separate Client/Server**

**File:** `lib/supabase.ts`

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase client (for use in components)
export function getSupabaseClientClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, key);
}

// Server-side Supabase client (deprecated - use lib/db.ts instead)
export function getSupabaseClient(): SupabaseClient {
  console.warn("⚠️ Using deprecated getSupabaseClient() from lib/supabase.ts. Use lib/db.ts instead.");
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

---

### 🔧 **FIX #5: Fix Solution Schema in `lib/db.ts`**

**File:** `lib/db.ts`

Replace the Solution interface (lines 40-46) to match actual database schema:

```typescript
export interface Solution {
  id: string;  // Changed from number
  question: string;  // Changed from issue_type
  solution: string;  // Changed from solution_text
  confidence?: number;  // Added
  created_at: string;
  updated_at?: string;  // Added
}

export type NewSolution = Omit<Solution, "id" | "created_at" | "updated_at">;
```

**Also update `upsertSolution()`:**

```typescript
export async function upsertSolution(solution: NewSolution): Promise<Solution> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("solutions")
    .upsert(solution, { onConflict: "question" })  // Changed from "issue_type,model"
    .select("*")
    .single();

  if (error) throw error;
  return data as Solution;
}
```

**Note:** This breaks `app/api/admin/solutions/route.ts` which expects `issue_type/model/solution_text`. That route needs to be updated to use `question/solution`.

---

### 🔧 **FIX #6: Update `app/api/admin/solutions/route.ts`**

**File:** `app/api/admin/solutions/route.ts`

This route currently uses old schema format. It needs to map to new format:

```typescript
// Current request body expects: issue_type, model, solution_text
// But database expects: question, solution

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { issue_type, model, solution_text, question, solution } = body;

    // Support both old and new formats
    const questionText = question || `${issue_type} - ${model}`;
    const solutionText = solution || solution_text;

    if (!questionText || !solutionText) {
      return NextResponse.json(
        { error: "question and solution are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("solutions")
      .upsert(
        {
          question: questionText.trim(),
          solution: solutionText.trim(),
        },
        { onConflict: "question" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, solution: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save solution" },
      { status: 500 }
    );
  }
}
```

---

### 🔧 **FIX #7: Fix `lib/knowledge-base.ts`**

**File:** `lib/knowledge-base.ts` (line 109, 230)

Replace `@/lib/supabase` imports with `@/lib/db`:

```typescript
// Line 109 - Change from:
const { getSupabaseClient } = await import("@/lib/supabase");

// To:
const { getSupabaseClient } = await import("@/lib/db");

// Line 230 - Already correct (uses @/lib/db)
```

---

### 🔧 **FIX #8: Fix `app/api/chatbot/stream/route.ts`**

**File:** `app/api/chatbot/stream/route.ts` (lines 29-30)

Simplify environment variable handling:

```typescript
// Remove custom fallback logic, use getSupabaseClient() which handles this
let supabase: any = null;
try {
  supabase = getSupabaseClient();
  // ... rest of code
} catch (supabaseError: any) {
  console.warn("Supabase unavailable:", supabaseError?.message);
  supabase = null;
}
```

---

## 7. RECOMMENDATIONS

### ✅ **Best Practices:**

1. **Separate Client/Server Clients:**
   - Client components → Use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Server routes → Use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

2. **Environment Variable Precedence:**
   - Server code should NEVER check `NEXT_PUBLIC_*` variables
   - Use service role key for all server operations

3. **Error Handling:**
   - Always wrap Supabase calls in try-catch
   - Provide meaningful fallbacks (JSON files, empty arrays, etc.)

4. **Schema Consistency:**
   - Keep TypeScript interfaces in sync with database schema
   - Use database migrations for schema changes

---

## 8. ROOT CAUSE ANALYSIS

**Primary Root Causes:**

1. **Lack of Standardization:** Two different Supabase client files with different patterns
2. **Documentation Gap:** Unclear which env vars are required
3. **Schema Evolution:** Solution table schema changed but types weren't updated
4. **Security Misunderstanding:** Server routes may be using anon key instead of service role key

---

## 9. TESTING CHECKLIST

After applying fixes, verify:

- [ ] All API routes work with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] Fallback to JSON works when Supabase unavailable
- [ ] Solutions can be added via admin panel
- [ ] Solutions can be queried by chatbot
- [ ] No errors in console about missing env vars
- [ ] No RLS policy errors in server routes

---

## 10. FINAL VERDICT

**Status:** ⚠️ **FAIL**

**Critical Issues:** 5  
**Warnings:** 3  
**Passed Checks:** 3  

**Action Required:** Apply all fixes before production deployment.

**Estimated Fix Time:** 2-3 hours

---

## Generated Fixes Summary

All fixes have been prepared as unified diffs above. Main changes:

1. ✅ Standardized environment variables
2. ✅ Fixed client/server separation
3. ✅ Fixed Solution schema mismatch
4. ✅ Updated all imports to use correct clients
5. ✅ Added proper error handling

**Next Steps:**
1. Create `.env.local` with correct variables
2. Apply code fixes above
3. Test all endpoints
4. Update documentation


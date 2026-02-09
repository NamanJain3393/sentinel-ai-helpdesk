import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    
    // Always fetch fresh solutions from database (no caching)
    // Use service role key to bypass RLS and ensure we get all solutions
    const { data, error } = await supabase
      .from("solutions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching solutions from Supabase:", error);
      // Return empty array instead of error if table doesn't exist or other issues
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        console.warn("Solutions table does not exist yet");
        return NextResponse.json({ solutions: [] });
      }
      // Check for RLS policy errors
      if (error.code === "42501" || error.message?.includes("permission denied")) {
        console.error("RLS policy error - ensure using service role key:", error.message);
        return NextResponse.json(
          { 
            solutions: [],
            error: "Permission denied. Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly.",
            warning: "Server routes must use service role key to bypass RLS policies."
          },
          { status: 200 }
        );
      }
      throw error;
    }
    
    console.log(`✅ Fetched ${data?.length || 0} fresh solutions from Supabase`);
    return NextResponse.json({ solutions: data || [] });
  } catch (error: any) {
    console.error("GET /api/solutions error:", error);
    
    // Check if it's a missing env var error
    if (error?.message?.includes("Missing SUPABASE_URL") || error?.message?.includes("Missing SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { 
          solutions: [],
          error: error.message,
          hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
        },
        { status: 200 }
      );
    }
    
    // Return empty array to prevent chatbot from breaking
    return NextResponse.json(
      { 
        solutions: [],
        error: error?.message || "Failed to fetch solutions",
        warning: "Solutions table may not be initialized. Please check your database."
      },
      { status: 200 } // Return 200 with empty array so frontend doesn't break
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, solution } = body;

    // Validate inputs
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "question is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!solution || typeof solution !== "string" || !solution.trim()) {
      return NextResponse.json(
        { error: "solution is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Insert solution with proper error handling
    const { data, error } = await supabase
      .from("solutions")
      .insert({ 
        question: question.trim(), 
        solution: solution.trim() 
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting solution:", error);
      
      // Check if it's a constraint violation (duplicate)
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        // Try to update existing solution instead
        const { data: updateData, error: updateError } = await supabase
          .from("solutions")
          .update({ solution: solution.trim(), updated_at: new Date().toISOString() })
          .eq("question", question.trim())
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        return NextResponse.json({ 
          success: true, 
          solution: updateData,
          message: "Solution updated (duplicate question found)" 
        });
      }
      
      // Check if table doesn't exist
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Solutions table does not exist. Please run the database migration first.",
            hint: "Check supabase-schema.sql and ensure the solutions table is created."
          },
          { status: 500 }
        );
      }
      
      throw error;
    }
    
    console.log("✅ Solution added successfully:", data?.id);
    return NextResponse.json({ success: true, solution: data });
  } catch (error: any) {
    console.error("POST /api/solutions error:", error);
    return NextResponse.json(
      { 
        error: error?.message || "Failed to create solution",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


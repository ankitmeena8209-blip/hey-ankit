// Supabase Edge Function: admin-manage-user
// Handles privileged admin actions: disable, restore, and delete user
// Verifies caller JWT and confirms profile.role === 'admin' before proceeding.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  action: "disable" | "restore" | "delete";
  targetUserId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verify caller identity using Anon client
    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseCaller.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify caller role is 'admin' from public.profiles
    const { data: callerProfile, error: profileError } = await supabaseCaller
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "active") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body: RequestPayload = await req.json();
    const { action, targetUserId } = body;

    if (!action || !targetUserId) {
      return new Response(JSON.stringify({ error: "Missing action or targetUserId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Protect against self-action
    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "Admin cannot perform this action on themselves" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Perform privileged action via Service Role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "disable") {
      // Set status to disabled
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ status: "disabled" })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      // Ban auth user so sessions are revoked
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876000h", // ~100 years
      });
      if (banError) throw banError;

      return new Response(JSON.stringify({ success: true, message: "User disabled successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore") {
      // Set status to active
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ status: "active" })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      // Unban auth user
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });
      if (unbanError) throw unbanError;

      return new Response(JSON.stringify({ success: true, message: "User restored successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Retrieve conversation to clean up storage images first
      const { data: conv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (conv?.id) {
        // List files in storage bucket under conversation
        const { data: files } = await supabaseAdmin.storage
          .from("chat-images")
          .list(conv.id);

        if (files && files.length > 0) {
          const filePaths = files.map((f) => `${conv.id}/${f.name}`);
          await supabaseAdmin.storage.from("chat-images").remove(filePaths);
        }
      }

      // Delete user from auth (cascades to profile, conversation, messages; message_audit rows stay preserved)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: "User deleted permanently" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

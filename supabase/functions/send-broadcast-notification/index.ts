// Supabase Edge Function: send-broadcast-notification
// Sends broadcast notifications using Supabase in-app notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { body } = await req.json();
    const { title, body: messageBody, zoneId, type } = body || {};

    if (!title || !messageBody) {
      throw new Error("Missing title or body");
    }

    // 1. Fetch Profiles
    let query = supabase.from('profiles').select('id');
    const { data: users, error } = await query;

    if (error) throw error;

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Insert notifications
    const inserts = users.map((u: any) => ({
      user_id: u.id,
      title,
      body: messageBody,
      data: { zoneId, type: type || 'ALERT' },
      read: false,
      created_at: new Date().toISOString()
    }));

    await supabase.from('notifications').insert(inserts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Broadcast delivered to ${inserts.length} users` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

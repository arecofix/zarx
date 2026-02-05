// @ts-ignore
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: any;

interface EmergencyPayload {
  emergency_id: string;
  latitude: number;
  longitude: number;
  victim_id: string;
}

console.log("🚀 Edge Function: process-emergency-sos initialized")

Deno.serve(async (req: Request) => {
  try {
    // 1. Parse & Validate Payload
    const payload: EmergencyPayload = await req.json()
    validatePayload(payload)
    
    // 2. Initialize Infrastructure
    const supabase = initSupabase()

    // 3. Execute Emergency Protocol
    await broadcastEmergency(supabase, payload)

    return new Response(
      JSON.stringify({ success: true, message: "SOS Broadcast Protocol Initiated" }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error("❌ SOS Processing Failed:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }
})

// --- HELPER FUNCTIONS (Clean Architecture: Infrastructure Layer) ---

function initSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

function validatePayload(p: EmergencyPayload) {
  if (!p.emergency_id || !p.latitude || !p.longitude) {
    throw new Error("Invalid Payload: Missing core emergency data")
  }
}

async function broadcastEmergency(supabase: SupabaseClient, payload: EmergencyPayload) {
  const channel = supabase.channel('emergency-broadcast')
  
  const status = await channel.send({
    type: 'broadcast',
    event: 'SOS_ALERT',
    payload: {
        alert_id: payload.emergency_id,
        victim_id: payload.victim_id,
        lat: payload.latitude,
        lng: payload.longitude, 
        timestamp: new Date().toISOString()
    }
  })

  // Deno doesn't await the socket ack the same way as client, but 'send' is async.
  console.log(`📡 Broadcast sent for Alert #${payload.emergency_id}`)
}


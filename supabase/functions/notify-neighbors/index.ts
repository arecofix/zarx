// @ts-nocheck
// Supabase Edge Function: notify-neighbors
// Notifies nearby devices using standard WebPush / Supabase alerts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  // 1. Verify Request
  const { record } = await req.json()
  
  // Only process critical alerts
  if (!record || (record.type !== 'SOS' && record.type !== 'SECURITY')) {
     return new Response(JSON.stringify({ message: 'Ignored type' }), { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 2. Find Neighbors using RPC within 500 meters
    const { data: tokens, error } = await supabase.rpc('get_nearby_device_tokens', {
       alert_lat: record.latitude,
       alert_lng: record.longitude,
       radius_meters: 500,
       exclude_user_id: record.user_id
    })

    if (error) throw error
    if (!tokens || tokens.length === 0) {
       return new Response(JSON.stringify({ message: 'No neighbors found' }), { status: 200 })
    }

    // 3. Insert in-app alert records for neighbors
    const alertInserts = tokens.map((t: any) => ({
      user_id: t.user_id,
      title: record.type === 'SOS' ? '🚨 ALERTA SOS CERCANA' : '⚠️ ALERTA DE SEGURIDAD',
      body: `Incidente reportado a 500m de tu ubicación. Revisa el mapa.`,
      data: {
        alertId: record.id,
        lat: record.latitude,
        lng: record.longitude,
        type: record.type
      },
      read: false,
      created_at: new Date().toISOString()
    }))

    if (alertInserts.length > 0) {
      await supabase.from('notifications').insert(alertInserts)
    }

    return new Response(
      JSON.stringify({ success: true, notified_count: alertInserts.length }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

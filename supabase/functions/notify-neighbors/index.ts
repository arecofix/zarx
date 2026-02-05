// @ts-nocheck
// Follow this setup guide to integrate the Deno runtime with your Supabase project:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import admin from "npm:firebase-admin@^11.0.0"

// Init Firebase Admin (Check if already initialized to avoid cold start errors)
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

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
    // 2. Find Neighbors using RPC
    // We search within 500 meters
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

    const distinctTokens = tokens.map((t: any) => t.fcm_token)

    // 3. Send Push Notification
    // We send a "Multicast" message
    const message = {
      tokens: distinctTokens,
      notification: {
        title: record.type === 'SOS' ? '🚨 ALERTA SOS CERCANA' : '⚠️ ALERTA DE SEGURIDAD',
        body: `Incidente reportado a ${500}m de tu ubicación. Revisa el mapa.`
      },
      data: {
        alertId: record.id,
        lat: String(record.latitude),
        lng: String(record.longitude),
        type: record.type
      },
      android: {
        priority: 'high',
        notification: {
           sound: 'default',
           channelId: 'zarx_critical_channel'
        }
      }
    }

    const response = await admin.messaging().sendEachForMulticast(message)

    return new Response(
      JSON.stringify({ success: true, sent_count: response.successCount }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

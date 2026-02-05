// Supabase Edge Function: send-alert-notification
// Triggered on INSERT to alerts table
// Sends FCM push notification to all admin tokens

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface Alert {
  id: string
  type: string
  priority: string
  description?: string
  latitude?: number
  longitude?: number
  address?: string
  is_panic?: boolean
}

serve(async (req) => {
  try {
    // Parse webhook payload
    const payload = await req.json()
    const alert = payload.record as Alert

    console.log('New alert received:', alert.id, alert.type)

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all admin FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('admin_tokens')
      .select('fcm_token, user_id')
      .eq('platform', 'web')

    if (tokensError) {
      throw tokensError
    }

    if (!tokens || tokens.length === 0) {
      console.log('No admin tokens found')
      return new Response(
        JSON.stringify({ message: 'No admin tokens to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${tokens.length} admin token(s)`)

    // Prepare notification
    const title = alert.is_panic 
      ? `🚨 ALERTA DE PÁNICO`
      : `🚨 NUEVA ALERTA: ${alert.type}`

    const body = alert.address 
      ? `${alert.description || 'Sin descripción'}\n📍 ${alert.address}`
      : alert.description || 'Nueva alerta recibida'

    // Send FCM notification to each token
    const promises = tokens.map(async (tokenData) => {
      try {
        const fcmPayload = {
          notification: {
            title,
            body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge-72x72.png',
            tag: 'zarx-alert',
            requireInteraction: true
          },
          data: {
            alert_id: alert.id,
            alert_type: alert.type,
            priority: alert.priority,
            latitude: alert.latitude?.toString() || '',
            longitude: alert.longitude?.toString() || '',
            click_action: '/admin/dispatch'
          },
          to: tokenData.fcm_token
        }

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FIREBASE_SERVER_KEY}`
          },
          body: JSON.stringify(fcmPayload)
        })

        const fcmResult = await fcmResponse.json()
        
        if (!fcmResponse.ok) {
          console.error('FCM error:', fcmResult)
          
          // If token is invalid, delete it
          if (fcmResult.results?.[0]?.error === 'InvalidRegistration' || 
              fcmResult.results?.[0]?.error === 'NotRegistered') {
            await supabase
              .from('admin_tokens')
              .delete()
              .eq('fcm_token', tokenData.fcm_token)
            
            console.log('Deleted invalid token')
          }
        } else {
          console.log('Notification sent successfully to:', tokenData.user_id)
        }

        return fcmResult
      } catch (error) {
        console.error('Error sending to token:', error)
        return { error: error.message }
      }
    })

    const results = await Promise.all(promises)

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent',
        results,
        alert_id: alert.id
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

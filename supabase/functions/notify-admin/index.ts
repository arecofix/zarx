// Supabase Edge Function: notify-admin
// Enhanced version with Telegram integration
// Triggered on INSERT to alerts table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY') || ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || ''
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
  media_url?: string
  created_at?: string
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const alert = payload.record as Alert

    console.log('🚨 New alert received:', alert.id, alert.type)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Send FCM Push Notifications
    const fcmResults = await sendFCMNotifications(supabase, alert)

    // 2. Send Telegram Notification (if configured)
    let telegramResult = null
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      telegramResult = await sendTelegramNotification(alert)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        alert_id: alert.id,
        fcm_sent: fcmResults.sent,
        fcm_failed: fcmResults.failed,
        telegram_sent: telegramResult?.success || false
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function sendFCMNotifications(supabase: any, alert: Alert) {
  const results = { sent: 0, failed: 0 }

  try {
    // Get all admin FCM tokens
    const { data: tokens, error } = await supabase
      .from('admin_tokens')
      .select('fcm_token, user_id')
      .eq('platform', 'web')

    if (error || !tokens || tokens.length === 0) {
      console.log('⚠️ No admin tokens found')
      return results
    }

    console.log(`📱 Found ${tokens.length} admin token(s)`)

    // Prepare notification
    const title = alert.is_panic 
      ? `🚨 ALERTA DE PÁNICO`
      : `🚨 NUEVA ALERTA: ${alert.type}`

    const body = alert.address 
      ? `${alert.description || 'Sin descripción'}\n📍 ${alert.address}`
      : alert.description || 'Nueva alerta recibida'

    // Send to each token
    for (const tokenData of tokens) {
      try {
        const fcmPayload = {
          notification: {
            title,
            body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge-72x72.png',
            tag: 'zarx-alert',
            requireInteraction: true,
            sound: 'default' // Play sound
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

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FIREBASE_SERVER_KEY}`
          },
          body: JSON.stringify(fcmPayload)
        })

        const result = await response.json()
        
        if (response.ok) {
          results.sent++
          console.log('✅ FCM sent to:', tokenData.user_id)
        } else {
          results.failed++
          console.error('❌ FCM error:', result)
          
          // Delete invalid tokens
          if (result.results?.[0]?.error === 'InvalidRegistration' || 
              result.results?.[0]?.error === 'NotRegistered') {
            await supabase
              .from('admin_tokens')
              .delete()
              .eq('fcm_token', tokenData.fcm_token)
            console.log('🗑️ Deleted invalid token')
          }
        }
      } catch (error) {
        results.failed++
        console.error('❌ Error sending to token:', error)
      }
    }
  } catch (error) {
    console.error('❌ FCM batch error:', error)
  }

  return results
}

async function sendTelegramNotification(alert: Alert) {
  try {
    // Format message
    const message = formatTelegramMessage(alert)

    // Send text message
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      }
    )

    if (!response.ok) {
      throw new Error('Telegram API error')
    }

    console.log('✅ Telegram notification sent')

    // Send photo if available
    if (alert.media_url) {
      await sendTelegramPhoto(alert.media_url, alert.type)
    }

    return { success: true }
  } catch (error) {
    console.error('❌ Telegram error:', error)
    return { success: false, error: error.message }
  }
}

function formatTelegramMessage(alert: Alert): string {
  const lines = [
    '🚨 <b>NUEVA ALERTA ZARX</b>',
    '',
    `<b>Tipo:</b> ${alert.type}`,
    `<b>Prioridad:</b> ${alert.priority}`,
    ''
  ]

  if (alert.description) {
    lines.push(`<b>Descripción:</b> ${alert.description}`)
    lines.push('')
  }

  if (alert.address) {
    lines.push(`📍 <b>Ubicación:</b> ${alert.address}`)
  } else if (alert.latitude && alert.longitude) {
    lines.push(`📍 <b>Coordenadas:</b> ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`)
  }

  if (alert.latitude && alert.longitude) {
    lines.push('')
    lines.push(`🗺️ <a href="https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}">Ver en Google Maps</a>`)
  }

  if (alert.created_at) {
    const date = new Date(alert.created_at)
    lines.push('')
    lines.push(`🕐 <b>Hora:</b> ${date.toLocaleString('es-AR')}`)
  }

  lines.push('')
  lines.push(`🆔 <code>${alert.id}</code>`)

  return lines.join('\n')
}

async function sendTelegramPhoto(photoUrl: string, caption: string) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: photoUrl,
          caption: `📸 Evidencia: ${caption}`
        })
      }
    )
    console.log('✅ Telegram photo sent')
  } catch (error) {
    console.error('❌ Telegram photo error:', error)
  }
}

// Supabase Edge Function: notify-admin
// Enhanced version with Telegram integration & Supabase notifications
// Triggered on INSERT to alerts table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // 1. Create in-app admin notifications
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    const title = alert.is_panic ? '🚨 ALERTA DE PÁNICO' : `🚨 NUEVA ALERTA: ${alert.type}`
    const body = alert.address ? `${alert.description || 'Sin descripción'}\n📍 ${alert.address}` : alert.description || 'Nueva alerta recibida'

    if (admins && admins.length > 0) {
      const records = admins.map((adm: any) => ({
        user_id: adm.id,
        title,
        body,
        data: {
          alert_id: alert.id,
          alert_type: alert.type,
          priority: alert.priority,
          latitude: alert.latitude,
          longitude: alert.longitude,
          click_action: '/admin/dispatch'
        },
        read: false,
        created_at: new Date().toISOString()
      }))
      await supabase.from('notifications').insert(records)
    }

    // 2. Send Telegram Notification (if configured)
    let telegramResult = null
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      telegramResult = await sendTelegramNotification(alert)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        alert_id: alert.id,
        admins_notified: admins?.length || 0,
        telegram_sent: telegramResult?.success || false
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
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

async function sendTelegramNotification(alert: Alert) {
  try {
    const isPanic = alert.is_panic
    const emoji = isPanic ? '🚨🚨🚨' : '⚠️'
    const priorityEmoji = alert.priority === 'CRITICAL' ? '🔴' : alert.priority === 'HIGH' ? '🟠' : '🟡'

    let message = `${emoji} *ZARX C4ISR - NUEVA ALERTA* ${emoji}\n\n`
    message += `*Tipo:* ${escapeMarkdown(alert.type)}\n`
    message += `*Prioridad:* ${priorityEmoji} ${alert.priority}\n`
    
    if (alert.description) {
      message += `*Descripción:* ${escapeMarkdown(alert.description)}\n`
    }

    if (alert.address) {
      message += `*Ubicación:* 📍 ${escapeMarkdown(alert.address)}\n`
    }

    if (alert.latitude && alert.longitude) {
      message += `*Coordenadas:* \`${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}\`\n`
      message += `[Ver en Google Maps](https://www.google.com/maps?q=${alert.latitude},${alert.longitude})\n`
    }

    const timestamp = alert.created_at ? new Date(alert.created_at).toLocaleString('es-AR') : new Date().toLocaleString('es-AR')
    message += `\n*Hora:* 🕐 ${timestamp}\n`
    message += `*ID:* \`${alert.id}\`\n\n`
    message += `[Abrir Centro de Despacho](https://zarx.arecofix.com.ar/admin/dispatch)`

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    })

    const result = await response.json()
    return { success: response.ok, result }
  } catch (error: any) {
    console.error('❌ Telegram error:', error)
    return { success: false, error: error.message }
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&')
}

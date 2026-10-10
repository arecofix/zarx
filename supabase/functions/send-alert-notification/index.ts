// Supabase Edge Function: send-alert-notification
// Triggered on INSERT to alerts table
// Dispatches notifications to admin team via Supabase alerts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const payload = await req.json()
    const alert = payload.record as Alert

    console.log('New alert received:', alert.id, alert.type)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminError) throw adminError

    const title = alert.is_panic 
      ? `🚨 ALERTA DE PÁNICO`
      : `🚨 NUEVA ALERTA: ${alert.type}`

    const body = alert.address 
      ? `${alert.description || 'Sin descripción'}\n📍 ${alert.address}`
      : alert.description || 'Nueva alerta recibida'

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        user_id: admin.id,
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

      await supabase.from('notifications').insert(notifications)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications dispatched',
        admins_count: admins?.length || 0,
        alert_id: alert.id
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
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

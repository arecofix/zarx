-- =========================================================================
-- Zarx C4ISR Platform - Isolated Schema Migration
-- Target: db.arecofix.com.ar (PostgreSQL / Supabase)
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS zarx;

GRANT USAGE ON SCHEMA zarx TO anon, authenticated, service_role, postgres;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS zarx.profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  dni TEXT,
  role TEXT DEFAULT 'citizen',
  reputation_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reports Table (Emergencias, Inundaciones, SOS, Clima)
CREATE TABLE IF NOT EXISTS zarx.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  media_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Zones Table (Zonas de Riesgo / Cuencas de Marcos Paz)
CREATE TABLE IF NOT EXISTS zarx.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  risk_level TEXT DEFAULT 'LOW',
  coordinates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Public Alerts Table (Alertas Oficiales SMN / Hidrológicas)
CREATE TABLE IF NOT EXISTS zarx.public_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Active Tracking Sessions
CREATE TABLE IF NOT EXISTS zarx.active_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Emergencies Table
CREATE TABLE IF NOT EXISTS zarx.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT DEFAULT 'SOS',
  status TEXT DEFAULT 'ACTIVE',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Active News
CREATE TABLE IF NOT EXISTS zarx.active_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS zarx.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE zarx.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.public_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.active_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.active_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarx.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permisivas para C4ISR
DROP POLICY IF EXISTS "zarx_profiles_all" ON zarx.profiles;
CREATE POLICY "zarx_profiles_all" ON zarx.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_reports_all" ON zarx.reports;
CREATE POLICY "zarx_reports_all" ON zarx.reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_zones_all" ON zarx.zones;
CREATE POLICY "zarx_zones_all" ON zarx.zones FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_public_alerts_all" ON zarx.public_alerts;
CREATE POLICY "zarx_public_alerts_all" ON zarx.public_alerts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_tracking_all" ON zarx.active_tracking_sessions;
CREATE POLICY "zarx_tracking_all" ON zarx.active_tracking_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_emergencies_all" ON zarx.emergencies;
CREATE POLICY "zarx_emergencies_all" ON zarx.emergencies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_news_all" ON zarx.active_news;
CREATE POLICY "zarx_news_all" ON zarx.active_news FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zarx_notifications_all" ON zarx.notifications;
CREATE POLICY "zarx_notifications_all" ON zarx.notifications FOR ALL USING (true) WITH CHECK (true);

-- Otorgar permisos completos
GRANT ALL ON ALL TABLES IN SCHEMA zarx TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA zarx TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON ROUTINES TO anon, authenticated, service_role, postgres;

-- =========================================================================
-- RPC FUNCTIONS
-- =========================================================================

-- Function 1: get_alerts_in_radius
CREATE OR REPLACE FUNCTION zarx.get_alerts_in_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  status TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION,
  profiles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.type,
    r.status,
    r.latitude,
    r.longitude,
    r.description,
    r.created_at,
    (6371000 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(center_lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(r.latitude))
      ))
    )) AS distance_meters,
    coalesce(
      (SELECT to_jsonb(p) FROM zarx.profiles p WHERE p.id = r.user_id),
      '{}'::jsonb
    ) AS profiles
  FROM zarx.reports r
  WHERE (6371000 * acos(
    least(1.0, greatest(-1.0,
      cos(radians(center_lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(center_lng)) +
      sin(radians(center_lat)) * sin(radians(r.latitude))
    ))
  )) <= radius_meters
  ORDER BY r.created_at DESC;
END;
$$;

-- Function 2: get_heatmap_data
CREATE OR REPLACE FUNCTION zarx.get_heatmap_data(hours_ago INTEGER DEFAULT 24)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  intensity DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.latitude, 
    r.longitude, 
    1.0::double precision AS intensity
  FROM zarx.reports r
  WHERE r.created_at >= (NOW() - (hours_ago || ' hours')::INTERVAL);
$$;

-- Function 3: validate_neighbor_report
CREATE OR REPLACE FUNCTION zarx.validate_neighbor_report(
  target_report_id UUID,
  validator_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE zarx.reports
  SET status = 'RESOLVED', updated_at = NOW()
  WHERE id = target_report_id;
  RETURN TRUE;
END;
$$;

-- Function 4: update_fcm_token
CREATE OR REPLACE FUNCTION zarx.update_fcm_token(token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN TRUE;
END;
$$;

-- Function 5: delete_own_account
CREATE OR REPLACE FUNCTION zarx.delete_own_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN TRUE;
END;
$$;

GRANT ALL ON ALL ROUTINES IN SCHEMA zarx TO anon, authenticated, service_role, postgres;

-- Datos Semilla de Marcos Paz (Zonas de Riesgo y Alerta Inicial)
INSERT INTO zarx.zones (name, type, risk_level, coordinates)
VALUES 
  ('Cuenca Arroyo La Paja - Marcos Paz', 'FLOOD_RISK', 'HIGH', '{"lat": -34.7750, "lng": -58.8250, "radius": 1500}'::jsonb),
  ('Cuenca Arroyo El Durazno - Zona Rural', 'FLOOD_RISK', 'MEDIUM', '{"lat": -34.8020, "lng": -58.8450, "radius": 2000}'::jsonb),
  ('Embalse Presa Roggero / Mariano Acosta', 'DAM_BUFFER', 'HIGH', '{"lat": -34.6980, "lng": -58.8550, "radius": 3000}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO zarx.public_alerts (title, severity, description, latitude, longitude, radius_meters, expires_at)
VALUES (
  'Monitoreo Hidrológico Preventivo - Cuenca Marcos Paz',
  'AMARILLO',
  'Sistema C4ISR activo: vigilancia de niveles en arroyos La Paja y El Durazno por lluvias previstas.',
  -34.7833,
  -58.8333,
  5000,
  NOW() + INTERVAL '7 days'
)
ON CONFLICT DO NOTHING;

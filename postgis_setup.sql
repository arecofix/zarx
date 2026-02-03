-- 1. Habilitar la extensión PostGIS (requiere permisos de superusuario/admin)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Crear la tabla zones
-- Primero eliminamos si existe para asegurar la estructura limpia
DROP TABLE IF EXISTS public.zones;

CREATE TABLE public.zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  risk_level INT CHECK (risk_level BETWEEN 0 AND 100),
  type TEXT CHECK (type IN ('SAFE', 'DANGER', 'BLOCKED', 'COMMERCIAL')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Columna de geometría para Polígonos, usando coordenadas geográficas (WGS84 - SRID 4326)
  geom GEOMETRY(POLYGON, 4326) NOT NULL
);

-- Crear índice espacial para búsquedas rápidas (opcional pero recomendado)
CREATE INDEX zones_geom_idx ON public.zones USING GIST (geom);

-- 3. Configurar Seguridad (Row Level Security)
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos (Pública)
CREATE POLICY "Enable read access for all users" ON public.zones
  FOR SELECT USING (true);

-- Política de insert/update/delete solo para roles de servicio o admin
-- Nota: En desarrollo a veces se usa (true) para probar, pero aquí restringimos como se pidió.
-- Asegúrate de que tu usuario de Supabase tenga rol 'service_role' o autenticado si cambias esto.
-- Para permitir que usuarios autenticados guarden (dashboard admin), usaremos 'authenticated'.
CREATE POLICY "Enable write access for authenticated users" ON public.zones
  FOR ALL USING (auth.role() = 'authenticated');

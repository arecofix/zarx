-- Migration: Create RPC Functions for Heatmap and Alerts
-- Fixes: 400 Bad Request errors for get_heatmap_data and get_alerts_in_radius

-- Drop ALL existing overloads of these functions (handles any signature)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('get_heatmap_data', 'get_alerts_in_radius', 'calculate_danger_level')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END
$$;

-- 1. Function: get_heatmap_data
-- Returns aggregated alert data for heatmap visualization
CREATE OR REPLACE FUNCTION public.get_heatmap_data(hours_ago INTEGER DEFAULT 24)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    intensity DOUBLE PRECISION,
    alert_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.latitude,
        r.longitude,
        -- Calculate intensity based on danger level and recency
        CASE 
            WHEN r.priority = 'CRITICAL' THEN 1.0
            WHEN r.priority = 'HIGH' THEN 0.8
            WHEN r.priority = 'MEDIUM' THEN 0.5
            ELSE 0.3
        END AS intensity,
        COUNT(*)::BIGINT AS alert_count
    FROM public.reports r
    WHERE 
        r.created_at >= NOW() - (hours_ago || ' hours')::INTERVAL
        AND r.status NOT IN ('FALSE_ALARM', 'RESOLVED')
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
    GROUP BY r.latitude, r.longitude, r.priority
    ORDER BY alert_count DESC;
END;
$$;

-- 2. Function: get_alerts_in_radius
-- Returns alerts within a specified radius from a point
CREATE OR REPLACE FUNCTION public.get_alerts_in_radius(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 2000
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    type TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT,
    priority TEXT,
    evidence_url TEXT,
    created_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
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
        r.description,
        r.latitude,
        r.longitude,
        r.status,
        r.priority,
        r.evidence_url,
        r.created_at,
        -- Calculate distance using PostGIS
        ST_Distance(
            r.location,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) AS distance_meters
    FROM public.reports r
    WHERE 
        r.location IS NOT NULL
        AND r.status NOT IN ('FALSE_ALARM', 'RESOLVED')
        AND ST_DWithin(
            r.location,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters ASC;
END;
$$;

-- 3. Function: calculate_danger_level
-- Calculates danger level for a specific location based on nearby alerts
CREATE OR REPLACE FUNCTION public.calculate_danger_level(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 200
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    alert_count INTEGER;
    danger_level INTEGER;
BEGIN
    -- Count alerts in radius from last 48 hours
    SELECT COUNT(*)::INTEGER INTO alert_count
    FROM public.reports r
    WHERE 
        r.location IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '48 hours'
        AND r.status NOT IN ('FALSE_ALARM', 'RESOLVED')
        AND ST_DWithin(
            r.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_meters
        );
    
    -- Calculate danger level (1-5 scale)
    danger_level := CASE
        WHEN alert_count >= 10 THEN 5  -- Critical
        WHEN alert_count >= 7 THEN 4   -- High
        WHEN alert_count >= 4 THEN 3   -- Medium
        WHEN alert_count >= 2 THEN 2   -- Low
        ELSE 1                          -- Very Low
    END;
    
    RETURN danger_level;
END;
$$;

-- 4. Create or replace active_heatmap view
-- This view shows alerts that are still within their TTL (Time To Live)
DROP VIEW IF EXISTS public.active_heatmap;

CREATE OR REPLACE VIEW public.active_heatmap AS
SELECT 
    r.id,
    r.latitude,
    r.longitude,
    r.type,
    r.created_at,
    -- Calculate TTL expiration (48 hours from creation)
    r.created_at + INTERVAL '48 hours' AS ttl_expires_at,
    -- Hours remaining until expiration
    EXTRACT(EPOCH FROM (r.created_at + INTERVAL '48 hours' - NOW())) / 3600 AS hours_remaining,
    -- Danger level based on priority
    CASE 
        WHEN r.priority = 'CRITICAL' THEN 5
        WHEN r.priority = 'HIGH' THEN 4
        WHEN r.priority = 'MEDIUM' THEN 3
        WHEN r.priority = 'LOW' THEN 2
        ELSE 1
    END AS danger_level,
    -- Intensity with temporal decay
    CASE 
        WHEN r.priority = 'CRITICAL' THEN 1.0
        WHEN r.priority = 'HIGH' THEN 0.8
        WHEN r.priority = 'MEDIUM' THEN 0.5
        ELSE 0.3
    END * 
    -- Apply decay factor based on age
    GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (48 * 3600))) AS intensity
FROM public.reports r
WHERE 
    r.created_at >= NOW() - INTERVAL '48 hours'
    AND r.status NOT IN ('FALSE_ALARM', 'RESOLVED')
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_heatmap_data(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_alerts_in_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_danger_level(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, anon;
GRANT SELECT ON public.active_heatmap TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_heatmap_data(INTEGER) IS 'Returns aggregated alert data for heatmap visualization within specified hours';
COMMENT ON FUNCTION public.get_alerts_in_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS 'Returns alerts within a radius from a center point, ordered by distance';
COMMENT ON FUNCTION public.calculate_danger_level(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS 'Calculates danger level (1-5) for a location based on nearby alerts';
COMMENT ON VIEW public.active_heatmap IS 'View of active alerts with temporal decay for heatmap display';

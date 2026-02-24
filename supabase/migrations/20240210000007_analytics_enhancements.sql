-- Migration: Analytics Enhancements
-- Implements missing RPCs for AnalyticsService

-- 1. Function: calculate_security_index
CREATE OR REPLACE FUNCTION public.calculate_security_index(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
    resolved_count INTEGER;
    danger_score INTEGER;
    result JSONB;
BEGIN
    -- Count active alerts in radius (2km)
    SELECT COUNT(*)::INTEGER INTO active_count
    FROM public.reports r
    WHERE 
        r.location IS NOT NULL
        AND r.status NOT IN ('FALSE_ALARM', 'RESOLVED')
        AND r.created_at >= NOW() - INTERVAL '48 hours'
        AND ST_DWithin(
            r.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000
        );

    -- Count resolved alerts in last 7 days
    SELECT COUNT(*)::INTEGER INTO resolved_count
    FROM public.reports r
    WHERE 
        r.status = 'RESOLVED'
        AND r.updated_at >= NOW() - INTERVAL '7 days'
        AND ST_DWithin(
            r.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000
        );

    -- Get danger score (using existing function)
    danger_score := public.calculate_danger_level(user_lat, user_lng, (radius_km * 1000)::INTEGER);

    -- Build Result
    result := jsonb_build_object(
        'status', CASE 
            WHEN danger_score >= 4 THEN 'ACTIVIDAD ALTA'
            WHEN danger_score >= 2 THEN 'ATENCIÓN'
            ELSE 'TRANQUILO'
        END,
        'color', CASE 
            WHEN danger_score >= 4 THEN 'ORANGE'
            WHEN danger_score >= 2 THEN 'YELLOW'
            ELSE 'GREEN'
        END,
        'active_alerts', active_count,
        'resolved_last_week', resolved_count,
        'danger_score', danger_score
    );

    RETURN result;
END;
$$;

-- 2. View: hourly_risk_stats
CREATE OR REPLACE VIEW public.hourly_risk_stats AS
SELECT 
    EXTRACT(HOUR FROM created_at)::INTEGER AS hour_of_day,
    type,
    COUNT(*)::INTEGER AS count
FROM public.reports
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY hour_of_day, type;

-- 3. Function: get_hotspots
-- Simple clustering by rounding coordinates to 3 decimal places (~110m)
CREATE OR REPLACE FUNCTION public.get_hotspots(hours_ago INTEGER DEFAULT 168)
RETURNS TABLE (
    cluster_id INTEGER,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_m DOUBLE PRECISION,
    total_alerts INTEGER,
    risk_score DOUBLE PRECISION,
    main_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH clustered AS (
        SELECT 
            (ROW_NUMBER() OVER ())::INTEGER as cid,
            ROUND(latitude::numeric, 3)::double precision as lat_grid,
            ROUND(longitude::numeric, 3)::double precision as lng_grid,
            COUNT(*)::INTEGER as alerts,
            AVG(CASE 
                WHEN priority = 'CRITICAL' THEN 100
                WHEN priority = 'HIGH' THEN 75
                WHEN priority = 'MEDIUM' THEN 50
                ELSE 25
            END)::double precision as avg_risk,
            mode() WITHIN GROUP (ORDER BY type) as mtype
        FROM public.reports
        WHERE created_at >= NOW() - (hours_ago || ' hours')::INTERVAL
        AND status != 'FALSE_ALARM'
        GROUP BY lat_grid, lng_grid
    )
    SELECT 
        cid as cluster_id,
        lat_grid as center_lat,
        lng_grid as center_lng,
        150.0::double precision as radius_m, -- Fixed approx radius
        alerts as total_alerts,
        avg_risk as risk_score,
        mtype::TEXT as main_type
    FROM clustered
    WHERE alerts >= 2; -- Only show areas with at least 2 reports
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.calculate_security_index(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, anon;
GRANT SELECT ON public.hourly_risk_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_hotspots(INTEGER) TO authenticated, anon;

-- Migration: Unified Reports Schema with Realtime and RLS
-- Fixed to avoid "Policy already exists" errors

-- 1. Ensure Table Exists with Correct Columns
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, 
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT), 
    status TEXT NOT NULL DEFAULT 'PENDING',
    evidence_url TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already there (idempotent alterations)
DO $$
BEGIN
    BEGIN ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM'; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS evidence_url TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 2. Indexes (IF NOT EXISTS handles idempotency)
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON public.reports USING GIST(location);

-- 3. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Drop first to avoid 42710 error)
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

-- Re-create Policies
CREATE POLICY "Users can insert own reports" 
ON public.reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'dispatcher', 'responder')
  ) 
  OR auth.uid() = user_id -- Users can see their own
);

CREATE POLICY "Admins can update reports" 
ON public.reports FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'dispatcher', 'responder')
  )
);

-- 5. Enable Realtime (Check if already added to avoid error)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;
END $$;

-- 6. Trigger (Drop first)
DROP TRIGGER IF EXISTS trigger_sync_reports_location ON public.reports;

CREATE OR REPLACE FUNCTION public.sync_reports_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_reports_location
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_reports_location();

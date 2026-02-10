-- Create EMERGENCIES table
CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'resolved', 'false_alarm')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Insert: Authenticated users can create emergencies (SOS)
CREATE POLICY "Users can insert their own emergencies" 
ON public.emergencies FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 2. Select: Admins and Dispatchers can view all. Users can view their own.
CREATE POLICY "Admins can view all emergencies" 
ON public.emergencies FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'dispatcher', 'responder')
  ) 
  OR auth.uid() = user_id
);

-- 3. Update: Admins/Dispatchers can update status
CREATE POLICY "Admins can update emergencies" 
ON public.emergencies FOR UPDATE
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'dispatcher', 'responder')
  )
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON public.emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_created_at ON public.emergencies(created_at DESC);

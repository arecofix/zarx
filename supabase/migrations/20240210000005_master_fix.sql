-- MASTER SCRIPT TO FIX ALL DATABASE ISSUES
-- Includes: Foreign Keys, Admin Permissions, Notifications, and Schema Updates

-- 1. Fix Foreign Key for Reports (Critical for dashboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_user_id_fkey' 
        AND table_name = 'reports'
    ) THEN
        ALTER TABLE public.reports 
        ADD CONSTRAINT reports_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add rejection_reason to reports
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Ensure Profiles have role column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'civilian';

-- 4. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text DEFAULT 'info',
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 5. Row Level Security (RLS) & Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES POLICIES ----
-- Drop old policies to valid conflicts
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read access for all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update key profile fields" ON public.profiles;

-- Create new Profile policies
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Read access for all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update key profile fields" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ---- REPORTS POLICIES ----
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'dispatcher', 'responder')) 
  OR auth.uid() = user_id
);

-- ---- NOTIFICATIONS POLICIES ----
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Users can see their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

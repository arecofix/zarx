-- Add rejection_reason column to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create Notifications table if not exists (for proper user notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;

CREATE POLICY "Users can see their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

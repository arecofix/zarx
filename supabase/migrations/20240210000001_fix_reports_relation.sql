-- Fix Foreign Key for Reports
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

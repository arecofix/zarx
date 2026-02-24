-- 1. Agregar columna rejection_reason a la tabla reports (si no existe)
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Crear tabla Notificaciones (si no existe)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. Configurar Seguridad (RLS) para Notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar errores de duplicado
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Crear nuevas políticas
CREATE POLICY "Users can see their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
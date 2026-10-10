-- Ensure schema zarx exists
CREATE SCHEMA IF NOT EXISTS zarx;

-- Ensure profiles table exists with all required columns
CREATE TABLE IF NOT EXISTS zarx.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'citizen',
    rank TEXT DEFAULT 'Cadete',
    display_id TEXT,
    reputation_score INT DEFAULT 100,
    is_shadowbanned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns if table already existed
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Cadete';
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT false;
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 100;
ALTER TABLE zarx.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Foreign key on reports if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'zarx' AND table_name = 'reports') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'zarx' AND constraint_name = 'fk_reports_profiles'
        ) THEN
            ALTER TABLE zarx.reports 
            ADD CONSTRAINT fk_reports_profiles 
            FOREIGN KEY (user_id) REFERENCES zarx.profiles(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- RLS on zarx.profiles
ALTER TABLE zarx.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON zarx.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON zarx.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON zarx.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON zarx.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON zarx.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
    ON zarx.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON zarx.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON zarx.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION zarx.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'super_admin')
        OR EXISTS (
            SELECT 1 FROM zarx.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = zarx, pg_temp;

CREATE POLICY "Admins can update any profile"
    ON zarx.profiles FOR UPDATE
    USING (zarx.is_admin());

CREATE POLICY "Admins can delete any profile"
    ON zarx.profiles FOR DELETE
    USING (zarx.is_admin());

-- Upsert Ezequiel Enrico Areco profile
INSERT INTO zarx.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    rank,
    display_id,
    reputation_score,
    is_shadowbanned,
    updated_at
) VALUES (
    '9da10a3a-e000-4a5e-8671-4f4c55266dbe',
    'Ezequiel Enrico areco',
    'ezequielenrico15@gmail.com',
    'https://lh3.googleusercontent.com/a/ACg8ocKkl21J1Ea4bYMPQpV9MrxaGVSodo4aSMfaNvx1rjSHzxLOLwI8jQ=s96-c',
    'admin',
    'Director C4ISR',
    'ZARX-0001',
    1000,
    false,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    rank = 'Director C4ISR',
    display_id = COALESCE(zarx.profiles.display_id, 'ZARX-0001'),
    full_name = COALESCE(zarx.profiles.full_name, 'Ezequiel Enrico areco'),
    email = COALESCE(zarx.profiles.email, 'ezequielenrico15@gmail.com'),
    avatar_url = COALESCE(zarx.profiles.avatar_url, 'https://lh3.googleusercontent.com/a/ACg8ocKkl21J1Ea4bYMPQpV9MrxaGVSodo4aSMfaNvx1rjSHzxLOLwI8jQ=s96-c'),
    updated_at = NOW();

-- Update auth.users metadata with admin role
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE id = '9da10a3a-e000-4a5e-8671-4f4c55266dbe';

-- Make sure storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    ('evidence', 'evidence', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure storage policies exist
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload evidence" ON storage.objects;

CREATE POLICY "Public can read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read evidence"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'evidence');

CREATE POLICY "Authenticated can upload evidence"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'evidence' AND auth.role() = 'authenticated');

-- Automatic trigger function for new auth users in zarx
CREATE OR REPLACE FUNCTION zarx.handle_new_user()
RETURNS trigger AS $$
DECLARE
    next_id INT;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_id FROM zarx.profiles;
    INSERT INTO zarx.profiles (
        id, 
        full_name, 
        email, 
        avatar_url, 
        role, 
        rank, 
        display_id, 
        reputation_score
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'citizen'),
        'Cadete',
        'ZARX-' || LPAD(next_id::TEXT, 4, '0'),
        100
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(zarx.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(zarx.profiles.avatar_url, EXCLUDED.avatar_url);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_zarx ON auth.users;
CREATE TRIGGER on_auth_user_created_zarx
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION zarx.handle_new_user();

-- Grant schema permissions to authenticated and anon
GRANT USAGE ON SCHEMA zarx TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA zarx TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA zarx TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA zarx TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA zarx GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';

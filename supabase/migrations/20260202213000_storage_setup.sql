-- 1. Create Bucket 'evidence' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- 2. Storage Policies (RLS)
-- Enable RLS on objects (it usually is enabled by default for storage.objects but good to ensure)
alter table storage.objects enable row level security;

-- Policy: Allow authenticated users to upload (INSERT)
create policy "Authenticated users can upload evidence"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'evidence' );

-- Policy: Allow public to view (SELECT) - Since it's a public bucket, this might be redundant for public access, 
-- but explicit policy is good practice if public access isn't strictly auto-handled by bucket setting alone in all contexts.
create policy "Public can view evidence"
on storage.objects for select
to public
using ( bucket_id = 'evidence' );

-- Policy: Allow owner or admin to delete
-- Assuming an app_role or similar column exists, or just checking auth.uid() == owner
create policy "Users can delete their own evidence"
on storage.objects for delete
to authenticated
using ( bucket_id = 'evidence' and auth.uid() = owner );

-- 3. Update 'alerts' table
alter table public.alerts 
add column if not exists evidence_url text,
add column if not exists description text; -- It might already exist, checking just in case

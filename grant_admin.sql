-- 1. Check if user exists (User must have tried to sign up first)
-- If the user is found, update their profile role to 'admin'

UPDATE public.profiles
SET role = 'admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'ezequielenrico15@gmail.com';

-- 2. Verify the update
SELECT * FROM public.profiles 
JOIN auth.users ON profiles.id = auth.users.id
WHERE auth.users.email = 'ezequielenrico15@gmail.com';

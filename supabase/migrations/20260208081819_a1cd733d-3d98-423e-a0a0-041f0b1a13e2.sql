
-- Backfill profiles for existing users that don't have one
INSERT INTO public.profiles (user_id, email, display_name, approved, blocked)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  CASE WHEN email = 'aveldominguez@gmail.com' THEN true ELSE false END,
  false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Ensure admin role for aveldominguez@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'aveldominguez@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign admin role to admin@instagram.com user
INSERT INTO public.user_roles (user_id, role)
VALUES ('4eae1189-dc4b-4a14-8fb1-46f0790bb9e6', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
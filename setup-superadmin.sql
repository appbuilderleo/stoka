-- Script para promover o seu utilizador a SuperAdmin
-- Substitua 'seu_email@exemplo.com' pelo email que usou para se registar no KaziHub

UPDATE public.profiles
SET role = 'superadmin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu_email@exemplo.com');

-- Para confirmar:
SELECT public.profiles.full_name, auth.users.email, public.profiles.role 
FROM public.profiles 
JOIN auth.users ON public.profiles.id = auth.users.id
WHERE auth.users.email = 'seu_email@exemplo.com';

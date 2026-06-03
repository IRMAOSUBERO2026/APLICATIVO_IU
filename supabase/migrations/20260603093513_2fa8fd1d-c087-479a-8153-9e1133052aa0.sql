ALTER TABLE public.portal_credentials
ADD COLUMN IF NOT EXISTS perfil_acesso text NOT NULL DEFAULT 'colaborador';
ALTER TABLE public.portal_credentials
  ADD COLUMN IF NOT EXISTS permissoes jsonb NOT NULL DEFAULT '[]'::jsonb;
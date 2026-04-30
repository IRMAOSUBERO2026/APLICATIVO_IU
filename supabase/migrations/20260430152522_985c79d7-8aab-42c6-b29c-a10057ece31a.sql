ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS bonificacoes_padrao jsonb NOT NULL DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
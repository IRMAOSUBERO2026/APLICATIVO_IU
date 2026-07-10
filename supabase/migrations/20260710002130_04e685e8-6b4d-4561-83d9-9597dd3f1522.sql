ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS naturalidade text,
  ADD COLUMN IF NOT EXISTS carteira_reservista text;
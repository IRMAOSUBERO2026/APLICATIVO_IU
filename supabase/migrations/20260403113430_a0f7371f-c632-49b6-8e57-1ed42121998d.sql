
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#3c502d',
  ADD COLUMN IF NOT EXISTS cor_secundaria text DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS nome_responsavel text,
  ADD COLUMN IF NOT EXISTS cargo_responsavel text;

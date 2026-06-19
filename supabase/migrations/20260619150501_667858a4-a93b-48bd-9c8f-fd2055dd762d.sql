ALTER TABLE public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_status_check;
ALTER TABLE public.funcionarios ADD CONSTRAINT funcionarios_status_check
  CHECK (status = ANY (ARRAY['ativo'::text, 'ferias'::text, 'afastado'::text, 'abandono'::text, 'experiencia'::text, 'desligado'::text]));
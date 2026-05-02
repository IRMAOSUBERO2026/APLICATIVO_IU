-- 1) Add observacoes column to funcionarios
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS observacoes text;

-- 2) Create global "SEM OBRA" obra (shared) if it does not exist.
-- Uses a fixed UUID so the app can reference it deterministically.
-- empresa_id points to the first existing empresa (required NOT NULL).
DO $$
DECLARE
  v_empresa_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.obras WHERE codigo = 'SEM-OBRA') THEN
    SELECT id INTO v_empresa_id FROM public.empresas ORDER BY created_at LIMIT 1;
    IF v_empresa_id IS NOT NULL THEN
      INSERT INTO public.obras (id, empresa_id, codigo, nome, status, observacoes)
      VALUES (
        '00000000-0000-0000-0000-000000005e30'::uuid,
        v_empresa_id,
        'SEM-OBRA',
        'SEM OBRA (Funcionários sem alocação)',
        'em_execucao',
        'Obra global usada para alocar funcionários antigos sem obra atual ou que abandonaram a empresa.'
      );
    END IF;
  END IF;
END $$;
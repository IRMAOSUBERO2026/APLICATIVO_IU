ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS mensalidade_sindical NUMERIC NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS valor_alimentacao NUMERIC NOT NULL DEFAULT 400;

ALTER TABLE public.folhas_pagamento
  ADD COLUMN IF NOT EXISTS beneficio_alimentacao NUMERIC NOT NULL DEFAULT 400;

ALTER TABLE public.folhas_pagamento
  ALTER COLUMN desconto_sindicato SET DEFAULT 20;

COMMENT ON COLUMN public.funcionarios.mensalidade_sindical IS 'Mensalidade sindical mensal aplicada ao fechamento da folha.';
COMMENT ON COLUMN public.funcionarios.valor_alimentacao IS 'Valor padrão editável do benefício mensal de alimentação.';
COMMENT ON COLUMN public.folhas_pagamento.beneficio_alimentacao IS 'Benefício de alimentação lançado como provento no fechamento mensal.';

NOTIFY pgrst, 'reload schema';
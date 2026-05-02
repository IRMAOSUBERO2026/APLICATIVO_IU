-- Adicionar campos fiscais em obras
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS percentual_retencao_padrao numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS impostos_padrao jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes_fiscais text;

COMMENT ON COLUMN public.obras.percentual_retencao_padrao IS 'Retenção contratual padrão sugerida ao criar medições (%)';
COMMENT ON COLUMN public.obras.impostos_padrao IS 'Lista de impostos padrão: [{imposto, aliquota}]';

-- Adicionar campos de aprovação em medicoes
ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS aprovado_por text,
  ADD COLUMN IF NOT EXISTS conta_receber_id uuid;

COMMENT ON COLUMN public.medicoes.conta_receber_id IS 'Conta a receber gerada quando a medição foi aprovada';
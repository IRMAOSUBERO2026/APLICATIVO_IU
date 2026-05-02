ALTER TABLE public.medicao_contrato_itens 
ADD COLUMN IF NOT EXISTS quantidade_acumulada_inicial numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.medicao_contrato_itens.quantidade_acumulada_inicial IS 'Quantidade já medida antes do início do uso do sistema (para itens importados parcialmente medidos).';
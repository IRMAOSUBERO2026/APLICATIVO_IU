-- ADICIONA SUPORTE PARA ACUMULADO ANTERIOR AO SISTEMA
-- Isso permite importar planilhas com medições já realizadas fora do app.

ALTER TABLE medicao_contrato_itens 
ADD COLUMN IF NOT EXISTS quantidade_acumulada_inicial DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN medicao_contrato_itens.quantidade_acumulada_inicial IS 'Quantidade já medida fora do sistema antes da implantação.';

-- Log de Verificação
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'medicao_contrato_itens' AND column_name = 'quantidade_acumulada_inicial';

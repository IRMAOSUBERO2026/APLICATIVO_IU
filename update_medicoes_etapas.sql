-- ADICIONA SUPORTE PARA CONDIÇÕES DE MEDIÇÃO (ETAPAS)
-- Permite que um único serviço seja medido em partes (ex: 80% execução, 20% acabamento)

ALTER TABLE medicao_contrato_itens 
ADD COLUMN IF NOT EXISTS condicoes_medicao JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN medicao_contrato_itens.condicoes_medicao IS 'Regras de medição parcelada. Ex: [{"etapa": "Execução", "percentual": 80}, {"etapa": "Desforma", "percentual": 20}]';

-- Ajuste na tabela de boletim para suportar o detalhamento da etapa medida
ALTER TABLE medicao_boletim_itens
ADD COLUMN IF NOT EXISTS etapa_medida TEXT;

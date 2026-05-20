-- ============================================================
-- PASSO 9 — Adicionar campos de responsáveis técnicos e CREA na tabela empresas
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_1 VARCHAR(255) DEFAULT 'Luis Fernando Gomez Ubero',
  ADD COLUMN IF NOT EXISTS crea_1 VARCHAR(50) DEFAULT 'PR-95695/D',
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_2 VARCHAR(255) DEFAULT 'Marcos Paulo Gomez Ubero',
  ADD COLUMN IF NOT EXISTS crea_2 VARCHAR(50) DEFAULT 'SC-120717-4';

COMMENT ON COLUMN empresas.responsavel_tecnico_1 IS 'Nome do Responsável Técnico 1 para carimbo digital EPI';
COMMENT ON COLUMN empresas.crea_1 IS 'CREA do Responsável Técnico 1';
COMMENT ON COLUMN empresas.responsavel_tecnico_2 IS 'Nome do Responsável Técnico 2 para carimbo digital EPI';
COMMENT ON COLUMN empresas.crea_2 IS 'CREA do Responsável Técnico 2';

-- ============================================================
-- Migração: 20260622104200_rhid_csv_campos
-- Descrição: Campos adicionais para importação de CSV do RHiD
-- ============================================================

-- Em ponto_apuracao_diaria
ALTER TABLE public.ponto_apuracao_diaria
  ADD COLUMN IF NOT EXISTS cnpj_obra text,
  ADD COLUMN IF NOT EXISTS justificativa text,
  ADD COLUMN IF NOT EXISTS nome_funcionario text;

-- Em obras (opcional, para cruzar pelo CNPJ)
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS cnpj text;

-- ============================================================================
-- Relatório de Ponto RHiD (CSV mensal, 20 colunas) — FONTE DE CONCILIAÇÃO.
-- NÃO substitui/alimenta ponto_apuracao_mensal nem folhas_pagamento.
--
-- IMPORTANTE: aplicar no banco EXTERNO oficial (projeto wtrefsziscauokudnxgz),
-- que é o realmente usado pelo app (ver src/integrations/supabase/client.ts).
-- Rode este arquivo da mesma forma que aplicou as demais migrations ponto_*.
--
-- Passo 0 (auditoria): já verificado que NÃO existem tabelas
--   ponto_relatorio_importacoes / ponto_relatorio_rhid_diario. Estas são novas
--   e não colidem com afd_* nem com ponto_apuracao_*.
-- ============================================================================

-- 1) Log de lotes de importação
CREATE TABLE IF NOT EXISTS public.ponto_relatorio_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  hash_arquivo text NOT NULL,
  competencia_mes int NOT NULL DEFAULT 0,
  competencia_ano int NOT NULL DEFAULT 0,
  total_linhas int NOT NULL DEFAULT 0,
  total_funcionarios int NOT NULL DEFAULT 0,
  cnpjs_encontrados jsonb,
  funcionarios_nao_encontrados jsonb,
  status text NOT NULL DEFAULT 'processando'
    CHECK (status IN ('processando','concluido','concluido_com_avisos','erro')),
  mensagens_erro jsonb,
  importado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ponto_rel_imp_hash ON public.ponto_relatorio_importacoes(hash_arquivo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_relatorio_importacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_relatorio_importacoes TO anon;
GRANT ALL ON public.ponto_relatorio_importacoes TO service_role;

ALTER TABLE public.ponto_relatorio_importacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ponto_relatorio_importacoes" ON public.ponto_relatorio_importacoes;
CREATE POLICY "Acesso total ponto_relatorio_importacoes"
  ON public.ponto_relatorio_importacoes FOR ALL USING (true) WITH CHECK (true);

-- 2) Registros diários do relatório RHiD
CREATE TABLE IF NOT EXISTS public.ponto_relatorio_rhid_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL REFERENCES public.ponto_relatorio_importacoes(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES public.funcionarios(id),
  cpf_funcionario text NOT NULL,
  nome_funcionario_rhid text NOT NULL,
  matricula_rhid text,
  cnpj_centro_custo text,
  data date NOT NULL,
  dia_semana text NOT NULL,
  tipo_dia text NOT NULL
    CHECK (tipo_dia IN ('normal','folga','feriado','falta','atestado','sem_vinculo')),
  entrada_1 time, marcador_entrada_1 text CHECK (marcador_entrada_1 IN ('I','C') OR marcador_entrada_1 IS NULL),
  saida_1   time, marcador_saida_1   text CHECK (marcador_saida_1   IN ('I','C') OR marcador_saida_1   IS NULL),
  entrada_2 time, marcador_entrada_2 text CHECK (marcador_entrada_2 IN ('I','C') OR marcador_entrada_2 IS NULL),
  saida_2   time, marcador_saida_2   text CHECK (marcador_saida_2   IN ('I','C') OR marcador_saida_2   IS NULL),
  entrada_3 time, marcador_entrada_3 text CHECK (marcador_entrada_3 IN ('I','C') OR marcador_entrada_3 IS NULL),
  saida_3   time, marcador_saida_3   text CHECK (marcador_saida_3   IN ('I','C') OR marcador_saida_3   IS NULL),
  total_normais_minutos int NOT NULL DEFAULT 0,
  dia_falta boolean NOT NULL DEFAULT false,
  horas_falta_minutos int NOT NULL DEFAULT 0,
  horas_atraso_minutos int NOT NULL DEFAULT 0,
  abono_minutos int NOT NULL DEFAULT 0,
  horas_extra_minutos int NOT NULL DEFAULT 0,
  extras_total_minutos int NOT NULL DEFAULT 0,
  nome_feriado text,
  justificativa text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cpf_funcionario, data, importacao_id)
);

CREATE INDEX IF NOT EXISTS idx_ponto_rhid_diario_funcionario ON public.ponto_relatorio_rhid_diario(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_ponto_rhid_diario_data ON public.ponto_relatorio_rhid_diario(data);
CREATE INDEX IF NOT EXISTS idx_ponto_rhid_diario_cpf ON public.ponto_relatorio_rhid_diario(cpf_funcionario);
CREATE INDEX IF NOT EXISTS idx_ponto_rhid_diario_lote ON public.ponto_relatorio_rhid_diario(importacao_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_relatorio_rhid_diario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_relatorio_rhid_diario TO anon;
GRANT ALL ON public.ponto_relatorio_rhid_diario TO service_role;

ALTER TABLE public.ponto_relatorio_rhid_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ponto_relatorio_rhid_diario" ON public.ponto_relatorio_rhid_diario;
CREATE POLICY "Acesso total ponto_relatorio_rhid_diario"
  ON public.ponto_relatorio_rhid_diario FOR ALL USING (true) WITH CHECK (true);

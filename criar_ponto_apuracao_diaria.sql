-- ============================================================================
-- Tabela de apuração diária de ponto importada do RHiD (CSV ControlID)
-- ============================================================================
-- 1 registro por funcionário por dia. Mantém os valores já calculados pelo RHiD
-- e campos editáveis pelo RH (atestados/justificativas lançados depois no módulo Folha).
--
-- IMPORTANTE: aplicar no banco EXTERNO oficial (projeto wtrefsziscauokudnxgz),
-- que é o realmente usado pelo app (ver src/integrations/supabase/client.ts).
-- Rode este arquivo da mesma forma que aplicou as demais migrations ponto_*.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ponto_apuracao_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  obra_id UUID REFERENCES public.obras(id),
  importacao_id UUID REFERENCES public.ponto_importacoes_log(id),
  nome_funcionario TEXT,
  cpf VARCHAR(11),
  pis VARCHAR(11),
  cargo TEXT,
  departamento TEXT,
  cnpj_obra VARCHAR(14),
  data DATE NOT NULL,
  entrada1 TIME,
  saida1 TIME,
  entrada2 TIME,
  saida2 TIME,
  entrada3 TIME,
  saida3 TIME,
  origem_batida VARCHAR(10) DEFAULT 'REP',
  tipo_dia VARCHAR(30) DEFAULT 'NORMAL',
  total_normais NUMERIC(6,2) DEFAULT 0,
  falta_atraso NUMERIC(6,2) DEFAULT 0,
  extra_diurna NUMERIC(6,2) DEFAULT 0,
  extra_noturna NUMERIC(6,2) DEFAULT 0,
  dia_falta BOOLEAN DEFAULT false,
  justificativa TEXT,
  abono BOOLEAN DEFAULT false,
  atestado_url TEXT,
  observacao TEXT,
  editado_manualmente BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cpf, data)
);

CREATE INDEX IF NOT EXISTS idx_apuracao_diaria_funcionario ON public.ponto_apuracao_diaria(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_apuracao_diaria_obra ON public.ponto_apuracao_diaria(obra_id);
CREATE INDEX IF NOT EXISTS idx_apuracao_diaria_data ON public.ponto_apuracao_diaria(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_apuracao_diaria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_apuracao_diaria TO anon;
GRANT ALL ON public.ponto_apuracao_diaria TO service_role;

ALTER TABLE public.ponto_apuracao_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total ponto_apuracao_diaria" ON public.ponto_apuracao_diaria;
CREATE POLICY "Acesso total ponto_apuracao_diaria"
  ON public.ponto_apuracao_diaria
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_ponto_apuracao_diaria_updated ON public.ponto_apuracao_diaria;
CREATE TRIGGER set_ponto_apuracao_diaria_updated
  BEFORE UPDATE ON public.ponto_apuracao_diaria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

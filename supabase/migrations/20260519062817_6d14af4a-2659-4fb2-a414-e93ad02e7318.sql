
-- updated_at helper (reuse if exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============== DOCUMENTOS DE SEGURANÇA DO TRABALHO ==============
CREATE TABLE public.seguranca_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  obra_id uuid,
  fornecedor_id uuid,
  tipo text NOT NULL DEFAULT 'outros', -- ltcat, pcmat, pcmso, ppra, pgr, laudo, aso_coletivo, outros
  titulo text NOT NULL,
  numero text,
  data_emissao date,
  data_validade date,
  arquivo_url text,
  observacoes text,
  status text NOT NULL DEFAULT 'vigente', -- vigente, vencido, vencendo, arquivado
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seg_docs_empresa ON public.seguranca_documentos(empresa_id);
CREATE INDEX idx_seg_docs_obra ON public.seguranca_documentos(obra_id);
CREATE INDEX idx_seg_docs_validade ON public.seguranca_documentos(data_validade);

ALTER TABLE public.seguranca_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público seguranca_documentos"
  ON public.seguranca_documentos FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_seg_docs_updated
  BEFORE UPDATE ON public.seguranca_documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== CONTRATOS DE ASSESSORIA SST ==============
CREATE TABLE public.seguranca_contratos_assessoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  obra_id uuid,
  fornecedor_id uuid,
  descricao text NOT NULL,
  valor_mensal numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 10,
  data_inicio date NOT NULL,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo', -- ativo, encerrado, suspenso
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seg_contratos_empresa ON public.seguranca_contratos_assessoria(empresa_id);
CREATE INDEX idx_seg_contratos_obra ON public.seguranca_contratos_assessoria(obra_id);

ALTER TABLE public.seguranca_contratos_assessoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público seguranca_contratos_assessoria"
  ON public.seguranca_contratos_assessoria FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_seg_contratos_updated
  BEFORE UPDATE ON public.seguranca_contratos_assessoria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== CUSTOS AVULSOS DE SST ==============
CREATE TABLE public.seguranca_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  obra_id uuid,
  fornecedor_id uuid,
  documento_id uuid, -- opcional: link com seguranca_documentos
  conta_pagar_id uuid, -- opcional: link com contas_pagar criada
  descricao text NOT NULL,
  tipo_documento text, -- LTCAT, PCMAT, etc.
  valor numeric NOT NULL DEFAULT 0,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'pendente', -- pendente, enviado_financeiro, pago
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seg_custos_empresa ON public.seguranca_custos(empresa_id);
CREATE INDEX idx_seg_custos_obra ON public.seguranca_custos(obra_id);
CREATE INDEX idx_seg_custos_status ON public.seguranca_custos(status);

ALTER TABLE public.seguranca_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público seguranca_custos"
  ON public.seguranca_custos FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_seg_custos_updated
  BEFORE UPDATE ON public.seguranca_custos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

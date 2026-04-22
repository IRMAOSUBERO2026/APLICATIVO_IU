-- 1) Tabela de solicitações vindas do Diário de Obra (EPI e Equipamentos)
CREATE TABLE IF NOT EXISTS public.solicitacoes_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  diario_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('epi','equipamento')),
  -- vínculo opcional ao cadastro
  produto_id uuid,
  equipamento_proprio_id uuid,
  -- ou descrição livre
  descricao_livre text,
  quantidade numeric NOT NULL DEFAULT 1,
  justificativa text NOT NULL,
  solicitante text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendida','recusada')),
  observacoes_atendimento text,
  atendido_por text,
  data_atendimento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público solicitacoes_diario"
  ON public.solicitacoes_diario FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_diario_obra ON public.solicitacoes_diario(obra_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_diario_status ON public.solicitacoes_diario(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_diario_diario ON public.solicitacoes_diario(diario_id);

CREATE OR REPLACE FUNCTION public.tg_solicitacoes_diario_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS solicitacoes_diario_set_updated ON public.solicitacoes_diario;
CREATE TRIGGER solicitacoes_diario_set_updated
BEFORE UPDATE ON public.solicitacoes_diario
FOR EACH ROW EXECUTE FUNCTION public.tg_solicitacoes_diario_updated();

-- 2) Vínculo de itens de compra com produtos do estoque
ALTER TABLE public.itens_compra
  ADD COLUMN IF NOT EXISTS produto_id uuid,
  ADD COLUMN IF NOT EXISTS estoque_processado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_itens_compra_produto ON public.itens_compra(produto_id);
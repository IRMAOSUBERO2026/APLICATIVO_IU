CREATE TABLE IF NOT EXISTS public.historico_alocacao_equipamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL,
  obra_origem_id UUID,
  obra_destino_id UUID,
  responsavel TEXT,
  observacoes TEXT,
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.historico_alocacao_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público historico_alocacao_equipamento"
  ON public.historico_alocacao_equipamento FOR ALL TO public USING (true) WITH CHECK (true);

-- Add new fields to obras for the pipeline
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS tipo_obra text;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS engenheiro_responsavel text;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS cliente text;

-- Create orcamentos table
CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL DEFAULT 'Orçamento Principal',
  versao integer NOT NULL DEFAULT 1,
  custo_total numeric NOT NULL DEFAULT 0,
  margem_percentual numeric NOT NULL DEFAULT 15,
  preco_final numeric NOT NULL DEFAULT 0,
  lucro_previsto numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público orcamentos" ON public.orcamentos FOR ALL TO public USING (true) WITH CHECK (true);

-- Create orcamento_itens table
CREATE TABLE public.orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  atividade text NOT NULL,
  descricao text,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0,
  custo_material numeric NOT NULL DEFAULT 0,
  custo_mao_obra numeric NOT NULL DEFAULT 0,
  custo_equipamento numeric NOT NULL DEFAULT 0,
  custo_unitario_total numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  observacoes text
);

ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público orcamento_itens" ON public.orcamento_itens FOR ALL TO public USING (true) WITH CHECK (true);

-- Create servicos_extras table
CREATE TABLE public.servicos_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  justificativa text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público servicos_extras" ON public.servicos_extras FOR ALL TO public USING (true) WITH CHECK (true);

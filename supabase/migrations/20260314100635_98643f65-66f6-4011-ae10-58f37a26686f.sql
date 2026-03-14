
-- Equipamentos Próprios
CREATE TABLE public.equipamentos_proprios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  marca text,
  modelo text,
  numero_serie text,
  data_aquisicao date,
  valor_aquisicao numeric DEFAULT 0,
  obra_id uuid REFERENCES public.obras(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  status text NOT NULL DEFAULT 'disponivel',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_proprios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público equipamentos_proprios" ON public.equipamentos_proprios FOR ALL TO public USING (true) WITH CHECK (true);

-- Manutenções de Equipamento
CREATE TABLE public.manutencoes_equipamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos_proprios(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'corretiva',
  descricao text NOT NULL,
  data_solicitacao date NOT NULL DEFAULT CURRENT_DATE,
  data_realizacao date,
  fornecedor text,
  valor_orcamento numeric DEFAULT 0,
  valor_aprovado numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'solicitada',
  observacoes text,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencoes_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público manutencoes_equipamento" ON public.manutencoes_equipamento FOR ALL TO public USING (true) WITH CHECK (true);

-- Solicitações de Compra de Equipamento
CREATE TABLE public.solicitacoes_compra_equipamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  marca text,
  modelo text,
  quantidade integer NOT NULL DEFAULT 1,
  valor_estimado numeric DEFAULT 0,
  obra_id uuid REFERENCES public.obras(id),
  solicitante text,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_compra_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público solicitacoes_compra_equipamento" ON public.solicitacoes_compra_equipamento FOR ALL TO public USING (true) WITH CHECK (true);

-- Equipamentos Locados
CREATE TABLE public.equipamentos_locados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  obra_id uuid REFERENCES public.obras(id),
  data_inicio date NOT NULL,
  data_fim date,
  tipo_contrato text NOT NULL DEFAULT 'mensal',
  numero_oc text,
  valor_mensal numeric DEFAULT 0,
  valor_diario numeric DEFAULT 0,
  quantidade integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_locados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público equipamentos_locados" ON public.equipamentos_locados FOR ALL TO public USING (true) WITH CHECK (true);

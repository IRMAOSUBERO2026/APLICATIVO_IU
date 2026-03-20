
-- Itens do contrato de medição (planilha base)
CREATE TABLE public.medicao_contrato_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  item_numero text NOT NULL,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  is_aditivo boolean NOT NULL DEFAULT false,
  aditivo_numero integer,
  aditivo_data date,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.medicao_contrato_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público medicao_contrato_itens" ON public.medicao_contrato_itens FOR ALL TO public USING (true) WITH CHECK (true);

-- Reajustes contratuais
CREATE TABLE public.medicao_reajustes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  data_aplicacao date NOT NULL,
  percentual numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'anual',
  motivo text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.medicao_reajustes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público medicao_reajustes" ON public.medicao_reajustes FOR ALL TO public USING (true) WITH CHECK (true);

-- Boletins de medição (períodos)
CREATE TABLE public.medicoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  numero integer NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  valor_bruto numeric NOT NULL DEFAULT 0,
  percentual_retencao numeric NOT NULL DEFAULT 5,
  valor_retencao numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(obra_id, numero)
);

ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público medicoes" ON public.medicoes FOR ALL TO public USING (true) WITH CHECK (true);

-- Itens medidos em cada boletim
CREATE TABLE public.medicao_boletim_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicao_id uuid NOT NULL REFERENCES public.medicoes(id) ON DELETE CASCADE,
  contrato_item_id uuid NOT NULL REFERENCES public.medicao_contrato_itens(id) ON DELETE CASCADE,
  quantidade_medida numeric NOT NULL DEFAULT 0,
  percentual_medido numeric NOT NULL DEFAULT 0,
  valor_medido numeric NOT NULL DEFAULT 0,
  modo_lancamento text NOT NULL DEFAULT 'quantidade',
  observacoes text
);

ALTER TABLE public.medicao_boletim_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público medicao_boletim_itens" ON public.medicao_boletim_itens FOR ALL TO public USING (true) WITH CHECK (true);

-- Retenções de impostos sugeridas
CREATE TABLE public.medicao_retencoes_impostos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicao_id uuid NOT NULL REFERENCES public.medicoes(id) ON DELETE CASCADE,
  imposto text NOT NULL,
  aliquota numeric NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  observacoes text
);

ALTER TABLE public.medicao_retencoes_impostos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público medicao_retencoes_impostos" ON public.medicao_retencoes_impostos FOR ALL TO public USING (true) WITH CHECK (true);

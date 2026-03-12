
CREATE TABLE public.contratos_locacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  obra_id uuid REFERENCES public.obras(id),
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'casa',
  locador text NOT NULL,
  locador_cpf_cnpj text,
  endereco text,
  cidade text,
  uf text,
  valor_mensal numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 10,
  data_inicio date NOT NULL,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_locacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público contratos_locacao" ON public.contratos_locacao
  FOR ALL TO public USING (true) WITH CHECK (true);

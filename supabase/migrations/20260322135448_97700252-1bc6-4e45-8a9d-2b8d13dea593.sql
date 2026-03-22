
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS rne text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS data_entrada_pais date;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS dependentes_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS data_rescisao date;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS motivo_rescisao text;

-- Estoque: tabela entregas_epi
CREATE TABLE IF NOT EXISTS public.entregas_epi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  quantidade numeric NOT NULL DEFAULT 1,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  ca_numero text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_epi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público entregas_epi" ON public.entregas_epi FOR ALL TO public USING (true) WITH CHECK (true);

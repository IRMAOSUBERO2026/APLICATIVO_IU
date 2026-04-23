
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for the storage bucket
CREATE POLICY "Acesso público upload documentos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Acesso público select documentos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documentos');
CREATE POLICY "Acesso público delete documentos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'documentos');

-- Table for exam/training price list
CREATE TABLE public.tabela_precos_exames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'exame',
  nome TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tabela_precos_exames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público tabela_precos_exames" ON public.tabela_precos_exames FOR ALL TO public USING (true) WITH CHECK (true);

-- Table for exam requests/solicitations
CREATE TABLE public.solicitacoes_exame (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  tipo_exame TEXT NOT NULL,
  exame_preco_id UUID REFERENCES public.tabela_precos_exames(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_realizado DATE,
  valor NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_exame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público solicitacoes_exame" ON public.solicitacoes_exame FOR ALL TO public USING (true) WITH CHECK (true);

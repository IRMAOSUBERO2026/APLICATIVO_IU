
-- Profiles (Auth users metadata + role)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  funcionario_id uuid,
  role text DEFAULT 'colaborador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Portal credentials (PIN access)
CREATE TABLE IF NOT EXISTS public.portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL UNIQUE,
  pin text,
  pin_configurado boolean NOT NULL DEFAULT false,
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público portal_credentials" ON public.portal_credentials FOR ALL USING (true) WITH CHECK (true);

-- Justificativas de ponto
CREATE TABLE IF NOT EXISTS public.justificativas_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL,
  data_ocorrencia date NOT NULL,
  tipo text NOT NULL,
  descricao text,
  anexo_url text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público justificativas_ponto" ON public.justificativas_ponto FOR ALL USING (true) WITH CHECK (true);

-- Solicitações de atualização de dados pessoais
CREATE TABLE IF NOT EXISTS public.solicitacoes_atualizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL,
  dados_novos jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  motivo_reprovacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_atualizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público solicitacoes_atualizacao" ON public.solicitacoes_atualizacao FOR ALL USING (true) WITH CHECK (true);

-- AFD importações
CREATE TABLE IF NOT EXISTS public.afd_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  obra_id uuid,
  relogio_serial text,
  empresa text,
  formato text,
  data_inicio timestamptz,
  data_fim timestamptz,
  total_registros integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.afd_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público afd_importacoes" ON public.afd_importacoes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.afd_funcionarios_relogio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL,
  cpf text,
  nome text,
  operacao text,
  data_hora timestamptz
);
ALTER TABLE public.afd_funcionarios_relogio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público afd_funcionarios_relogio" ON public.afd_funcionarios_relogio FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.afd_registros_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL,
  obra_id uuid,
  nsr integer,
  cpf text NOT NULL,
  data_hora timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.afd_registros_ponto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público afd_registros_ponto" ON public.afd_registros_ponto FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_afd_registros_cpf ON public.afd_registros_ponto(cpf);
CREATE INDEX IF NOT EXISTS idx_afd_registros_data ON public.afd_registros_ponto(data_hora);

-- Sugestões (caixa de sugestões do portal)
CREATE TABLE IF NOT EXISTS public.sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid,
  titulo text NOT NULL,
  descricao text,
  anonimo boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público sugestoes" ON public.sugestoes FOR ALL USING (true) WITH CHECK (true);

-- View consolidada de ponto
CREATE OR REPLACE VIEW public.vw_ponto_consolidado AS
SELECT
  r.id,
  r.importacao_id,
  r.obra_id,
  o.nome AS obra_nome,
  r.nsr,
  r.cpf,
  COALESCE(f.nome, fr.nome) AS nome_funcionario,
  r.data_hora,
  r.created_at
FROM public.afd_registros_ponto r
LEFT JOIN public.obras o ON o.id = r.obra_id
LEFT JOIN public.funcionarios f ON regexp_replace(f.cpf, '\D', '', 'g') = regexp_replace(r.cpf, '\D', '', 'g')
LEFT JOIN LATERAL (
  SELECT nome FROM public.afd_funcionarios_relogio
  WHERE importacao_id = r.importacao_id AND cpf = r.cpf
  LIMIT 1
) fr ON true;

-- =============================================
-- TABELAS BASE
-- =============================================

-- Empresas (CNPJs do grupo)
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  inscricao_estadual TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Obras (centro de custo)
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  construtora TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  data_inicio DATE,
  data_previsao_fim DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'pausada', 'concluida', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- MÓDULO RH
-- =============================================

-- Funcionários
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  foto_url TEXT,
  cpf TEXT NOT NULL UNIQUE,
  rg TEXT,
  pis TEXT,
  ctps TEXT,
  serie_ctps TEXT,
  cargo TEXT NOT NULL,
  data_admissao DATE NOT NULL,
  data_nascimento DATE,
  estado_civil TEXT,
  nacionalidade TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  titulo_eleitor TEXT,
  zona_eleitoral TEXT,
  secao_eleitoral TEXT,
  cnh TEXT,
  categoria_cnh TEXT,
  validade_cnh DATE,
  nome_mae TEXT,
  nome_pai TEXT,
  escolaridade TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT,
  codigo_pix TEXT,
  salario_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  salario_combinado DECIMAL(10,2),
  dependentes INTEGER DEFAULT 0,
  clinica_aso TEXT,
  data_aso DATE,
  data_nr6 DATE,
  data_nr12 DATE,
  data_nr18 DATE,
  data_nr35 DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'ferias', 'afastado', 'desligado')),
  data_rescisao DATE,
  motivo_rescisao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documentos dos funcionários (pasta digital)
CREATE TABLE public.documentos_funcionario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- MÓDULO COMPRAS
-- =============================================

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  cpf TEXT,
  inscricao_estadual TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compras (pedidos/notas)
CREATE TABLE public.compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  nfe_numero TEXT,
  nfe_chave TEXT,
  data_emissao DATE NOT NULL,
  data_entrega DATE,
  data_recebimento DATE,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'xml', 'pdf')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recebida', 'cancelada')),
  forma_pagamento TEXT,
  parcelas INTEGER DEFAULT 1,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  xml_original TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens da compra
CREATE TABLE public.itens_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compra_id UUID REFERENCES public.compras(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(12,4) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  ncm TEXT,
  cfop TEXT
);

-- =============================================
-- MÓDULO ESTOQUE
-- =============================================

-- Produtos/Materiais
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  estoque_minimo DECIMAL(10,3) DEFAULT 0,
  ncm TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'ajuste')),
  quantidade DECIMAL(10,3) NOT NULL,
  valor_unitario DECIMAL(12,4),
  documento TEXT,
  observacoes TEXT,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- MÓDULO FINANCEIRO
-- =============================================

-- Contas a Pagar
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(12,2),
  forma_pagamento TEXT,
  documento TEXT,
  parcela INTEGER DEFAULT 1,
  total_parcelas INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contas a Receber
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  cliente TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  valor_recebido DECIMAL(12,2),
  forma_recebimento TEXT,
  documento TEXT,
  parcela INTEGER DEFAULT 1,
  total_parcelas INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- MÓDULO DIÁRIO DE OBRA
-- =============================================

CREATE TABLE public.diarios_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  clima TEXT,
  temperatura_min DECIMAL(4,1),
  temperatura_max DECIMAL(4,1),
  condicoes_trabalho TEXT,
  atividades_executadas TEXT,
  mao_de_obra_presente INTEGER,
  ocorrencias TEXT,
  observacoes TEXT,
  fotos TEXT[],
  responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(obra_id, data)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_funcionarios_empresa ON public.funcionarios(empresa_id);
CREATE INDEX idx_funcionarios_obra ON public.funcionarios(obra_id);
CREATE INDEX idx_funcionarios_status ON public.funcionarios(status);
CREATE INDEX idx_obras_empresa ON public.obras(empresa_id);
CREATE INDEX idx_obras_status ON public.obras(status);
CREATE INDEX idx_compras_empresa ON public.compras(empresa_id);
CREATE INDEX idx_compras_obra ON public.compras(obra_id);
CREATE INDEX idx_compras_status ON public.compras(status);
CREATE INDEX idx_itens_compra_compra ON public.itens_compra(compra_id);
CREATE INDEX idx_movimentacoes_produto ON public.movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_obra ON public.movimentacoes_estoque(obra_id);
CREATE INDEX idx_contas_pagar_empresa ON public.contas_pagar(empresa_id);
CREATE INDEX idx_contas_pagar_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX idx_contas_receber_empresa ON public.contas_receber(empresa_id);
CREATE INDEX idx_contas_receber_vencimento ON public.contas_receber(data_vencimento);
CREATE INDEX idx_diarios_obra_data ON public.diarios_obra(obra_id, data);

-- =============================================
-- RLS POLICIES (acesso público para MVP)
-- =============================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_funcionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarios_obra ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura/escrita públicas (ajustar após implementar auth)
CREATE POLICY "Acesso público empresas" ON public.empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público obras" ON public.obras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público funcionarios" ON public.funcionarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público documentos_funcionario" ON public.documentos_funcionario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público fornecedores" ON public.fornecedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público compras" ON public.compras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público itens_compra" ON public.itens_compra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público movimentacoes_estoque" ON public.movimentacoes_estoque FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público contas_pagar" ON public.contas_pagar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público contas_receber" ON public.contas_receber FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público diarios_obra" ON public.diarios_obra FOR ALL USING (true) WITH CHECK (true);
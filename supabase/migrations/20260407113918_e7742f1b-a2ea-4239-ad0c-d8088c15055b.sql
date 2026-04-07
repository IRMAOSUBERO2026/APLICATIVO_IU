
-- Tabela de solicitações de assinatura digital
CREATE TABLE public.assinaturas_digitais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  funcionario_id UUID NOT NULL,
  documento_tipo TEXT NOT NULL, -- 'ficha_epi', 'holerite', 'advertencia', 'ferias', 'contrato', 'treinamento', 'rescisao', 'outros'
  documento_titulo TEXT NOT NULL,
  documento_descricao TEXT,
  documento_url TEXT, -- URL do documento no storage
  documento_dados JSONB, -- dados extras do documento (ex: itens EPI)
  token_acesso TEXT NOT NULL UNIQUE, -- token único para acesso externo
  token_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'visualizado', 'assinado', 'recusado', 'expirado'
  -- Verificação de identidade
  cpf_confirmado BOOLEAN DEFAULT false,
  selfie_url TEXT, -- foto selfie com documento
  telefone_confirmado BOOLEAN DEFAULT false,
  email_confirmado BOOLEAN DEFAULT false,
  ip_assinatura TEXT,
  user_agent TEXT,
  data_visualizacao TIMESTAMP WITH TIME ZONE,
  data_assinatura TIMESTAMP WITH TIME ZONE,
  motivo_recusa TEXT,
  observacoes TEXT,
  solicitado_por TEXT, -- nome do gestor que solicitou
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.assinaturas_digitais ENABLE ROW LEVEL SECURITY;

-- Policy pública (sem auth por enquanto)
CREATE POLICY "Acesso público assinaturas_digitais" ON public.assinaturas_digitais
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Clínicas parceiras
CREATE TABLE seguranca_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(60) NOT NULL,
  cidade VARCHAR(60),
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO seguranca_clinicas (nome, cidade) VALUES
  ('SEGMED', 'Itajaí'),
  ('JMD', 'Itajaí'),
  ('JMD - BALNEÁRIO', 'Balneário Camboriú');

-- Documentos de segurança (ASO e NRs)
CREATE TABLE seguranca_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  obra_id UUID REFERENCES obras(id),
  clinica_id UUID REFERENCES seguranca_clinicas(id),
  tipo VARCHAR(10) NOT NULL,
  subtipo VARCHAR(20),
  data_realizacao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'vigente',
  arquivo_url VARCHAR(500),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_segdoc_funcionario ON seguranca_documentos(funcionario_id);
CREATE INDEX idx_segdoc_tipo ON seguranca_documentos(tipo);
CREATE INDEX idx_segdoc_vencimento ON seguranca_documentos(data_vencimento);
CREATE INDEX idx_segdoc_status ON seguranca_documentos(status);

-- Log de alertas gerados (evita duplicatas)
CREATE TABLE seguranca_alertas_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES seguranca_documentos(id),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  tipo_alerta VARCHAR(20) NOT NULL,
  enviado_em TIMESTAMPTZ DEFAULT NOW()
);

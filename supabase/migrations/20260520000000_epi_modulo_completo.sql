-- ============================================================
-- MÓDULO EPI COMPLETO — IU Engenharia ERP
-- Migration: 20260520000000_epi_modulo_completo.sql
-- ============================================================

-- ============================================================
-- PASSO 0 — CA no cadastro de produtos
-- ============================================================
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ca_numero VARCHAR(20);

COMMENT ON COLUMN produtos.ca_numero IS
  'Certificado de Aprovação do EPI — preenchido no cadastro do produto, puxado automaticamente na entrega';

-- ============================================================
-- PASSO 1 — Novos campos em entregas_epi
-- ============================================================
ALTER TABLE entregas_epi
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo',
  -- 'ativo' | 'devolvido' | 'perdido' | 'danificado'
  ADD COLUMN IF NOT EXISTS data_devolucao DATE,
  ADD COLUMN IF NOT EXISTS confirmacao_tipo VARCHAR(20) DEFAULT 'pendente',
  -- 'foto_responsavel' | 'assinatura_digital' | 'pdf_fisico' | 'pendente'
  ADD COLUMN IF NOT EXISTS confirmacao_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS confirmacao_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS disponivel_reuso BOOLEAN DEFAULT false;
  -- true quando devolvido e EPI é reutilizável (uniforme/capacete/cinto/talabarte)

COMMENT ON COLUMN entregas_epi.status IS 'Status do EPI: ativo | devolvido | perdido | danificado';
COMMENT ON COLUMN entregas_epi.confirmacao_tipo IS 'Como foi confirmado: foto_responsavel | assinatura_digital | pdf_fisico | pendente';
COMMENT ON COLUMN entregas_epi.disponivel_reuso IS 'true quando devolvido e EPI é reutilizável';

-- ============================================================
-- PASSO 2 — Tabela de tokens de assinatura digital EPI
-- ============================================================
CREATE TABLE IF NOT EXISTS epi_tokens_assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  entregas_ids UUID[] NOT NULL DEFAULT '{}',
  -- array de IDs de entregas_epi pendentes de assinatura
  status VARCHAR(20) DEFAULT 'pendente' NOT NULL,
  -- 'pendente' | 'assinado' | 'expirado'
  assinatura_url VARCHAR(500),
  expira_em TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours' NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assinado_em TIMESTAMPTZ,
  CONSTRAINT epi_tokens_status_check CHECK (status IN ('pendente', 'assinado', 'expirado'))
);

COMMENT ON TABLE epi_tokens_assinatura IS 'Tokens de assinatura digital de fichas EPI — válidos por 48h';
COMMENT ON COLUMN epi_tokens_assinatura.entregas_ids IS 'Array de IDs de entregas_epi incluídas nesta assinatura';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_epi_tokens_token ON epi_tokens_assinatura(token);
CREATE INDEX IF NOT EXISTS idx_epi_tokens_funcionario ON epi_tokens_assinatura(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_epi_tokens_status ON epi_tokens_assinatura(status);
CREATE INDEX IF NOT EXISTS idx_entregas_epi_status ON entregas_epi(status);
CREATE INDEX IF NOT EXISTS idx_entregas_epi_confirmacao ON entregas_epi(confirmacao_tipo);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- epi_tokens_assinatura: acesso público ao token (para assinatura via link)
ALTER TABLE epi_tokens_assinatura ENABLE ROW LEVEL SECURITY;

-- Admins e RH podem gerenciar tudo
CREATE POLICY "epi_tokens_admin_all" ON epi_tokens_assinatura
  FOR ALL USING (true);

-- Atualizar status em entregas_epi para tokens expirados automaticamente
-- (executar via cron ou na leitura)

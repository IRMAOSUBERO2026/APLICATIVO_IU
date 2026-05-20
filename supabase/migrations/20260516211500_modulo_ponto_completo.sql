-- 1.1 Alterar funcionarios para garantir campo PIS
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS pis VARCHAR(11) UNIQUE;

-- 1.2 Equipamentos
CREATE TABLE IF NOT EXISTS ponto_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id),
  serial_numero VARCHAR(20) UNIQUE NOT NULL,
  modelo VARCHAR(50),
  descricao VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Batidas raw
CREATE TABLE IF NOT EXISTS ponto_batidas_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID REFERENCES ponto_equipamentos(id),
  funcionario_id UUID REFERENCES funcionarios(id),
  pis VARCHAR(11),
  timestamp_batida TIMESTAMPTZ NOT NULL,
  tipo_registro VARCHAR(20) NOT NULL,
  obra_id_batida UUID REFERENCES obras(id),
  e_deslocamento BOOLEAN DEFAULT false,
  sequencia_afd INTEGER,
  hash_verificacao VARCHAR(10),
  arquivo_origem VARCHAR(100),
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  importado_por UUID REFERENCES auth.users(id),
  UNIQUE(sequencia_afd, equipamento_id)
);
CREATE INDEX IF NOT EXISTS idx_batidas_funcionario ON ponto_batidas_raw(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_batidas_pis ON ponto_batidas_raw(pis);
CREATE INDEX IF NOT EXISTS idx_batidas_timestamp ON ponto_batidas_raw(timestamp_batida);
CREATE INDEX IF NOT EXISTS idx_batidas_data ON ponto_batidas_raw(DATE(timestamp_batida));

-- 1.4 Jornadas
CREATE TABLE IF NOT EXISTS ponto_jornadas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(60) NOT NULL,
  entrada1_prevista TIME NOT NULL DEFAULT '07:00',
  saida1_prevista TIME NOT NULL DEFAULT '12:00',
  entrada2_prevista TIME NOT NULL DEFAULT '13:00',
  saida2_prevista TIME NOT NULL DEFAULT '17:00',
  tolerancia_minutos INTEGER DEFAULT 10,
  horas_diarias NUMERIC(4,2) DEFAULT 8.0,
  he_percentual_dia INTEGER DEFAULT 50,
  he_percentual_folga INTEGER DEFAULT 100,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir jornada padrão se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ponto_jornadas_config WHERE nome = 'Jornada Padrão Obra') THEN
        INSERT INTO ponto_jornadas_config (nome) VALUES ('Jornada Padrão Obra');
    END IF;
END $$;

-- 1.5 Inconsistencias
CREATE TABLE IF NOT EXISTS ponto_inconsistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  obra_id UUID REFERENCES obras(id),
  data_referencia DATE NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  descricao TEXT,
  pis_desconhecido VARCHAR(11),
  status VARCHAR(20) DEFAULT 'aberta',
  prazo_resolucao TIMESTAMPTZ,
  notificacao_enviada BOOLEAN DEFAULT false,
  criada_em TIMESTAMPTZ DEFAULT NOW(),
  resolvida_em TIMESTAMPTZ,
  resolvida_por UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_inconsistencias_status ON ponto_inconsistencias(status);
CREATE INDEX IF NOT EXISTS idx_inconsistencias_funcionario ON ponto_inconsistencias(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_inconsistencias_data ON ponto_inconsistencias(data_referencia);

-- 1.6 Justificativas
CREATE TABLE IF NOT EXISTS ponto_justificativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inconsistencia_id UUID NOT NULL REFERENCES ponto_inconsistencias(id),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  tipo VARCHAR(30) NOT NULL,
  descricao TEXT,
  arquivo_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pendente',
  criada_em TIMESTAMPTZ DEFAULT NOW(),
  aprovada_por UUID REFERENCES auth.users(id),
  aprovada_em TIMESTAMPTZ,
  observacao_aprovador TEXT
);

-- 1.7 Apuracao mensal
CREATE TABLE IF NOT EXISTS ponto_apuracao_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  obra_id UUID NOT NULL REFERENCES obras(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  horas_normais NUMERIC(6,2) DEFAULT 0,
  horas_extras_50 NUMERIC(6,2) DEFAULT 0,
  horas_extras_100 NUMERIC(6,2) DEFAULT 0,
  faltas_dias INTEGER DEFAULT 0,
  atrasos_minutos INTEGER DEFAULT 0,
  dias_trabalhados INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'aberta',
  observacoes TEXT,
  aprovada_por UUID REFERENCES auth.users(id),
  aprovada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, mes, ano)
);

-- 1.8 Log de importacoes
CREATE TABLE IF NOT EXISTS ponto_importacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID REFERENCES ponto_equipamentos(id),
  obra_id UUID REFERENCES obras(id),
  arquivo_nome VARCHAR(100),
  periodo_inicio DATE,
  periodo_fim DATE,
  total_registros INTEGER,
  registros_biometricos INTEGER,
  pis_desconhecidos INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'concluido',
  erros TEXT,
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  importado_por UUID REFERENCES auth.users(id)
);

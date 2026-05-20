ALTER TABLE ponto_apuracao_mensal
ADD COLUMN IF NOT EXISTS atestados_dias INTEGER DEFAULT 0;

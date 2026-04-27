-- GESTÃO DE CONTRATOS E MEDIÇÕES - OBRA SURYA
-- INCLUI SEGURANÇA RLS

-- 1. Criar tabelas
CREATE TABLE IF NOT EXISTS contratos_obra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id),
    cliente_nome TEXT,
    valor_total DECIMAL(12,2),
    data_inicio DATE,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_contrato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID REFERENCES contratos_obra(id),
    descricao TEXT,
    unidade TEXT,
    quantidade_total DECIMAL(12,2),
    valor_unitario DECIMAL(12,2),
    quantidade_medida_acumulada DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS (Segurança)
ALTER TABLE contratos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_contrato ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso (Apenas usuários autenticados)
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON contratos_obra;
CREATE POLICY "Permitir leitura para autenticados" ON contratos_obra FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON contratos_obra;
CREATE POLICY "Permitir inserção para autenticados" ON contratos_obra FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON itens_contrato;
CREATE POLICY "Permitir leitura para autenticados" ON itens_contrato FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON itens_contrato;
CREATE POLICY "Permitir inserção para autenticados" ON itens_contrato FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Inserir o Contrato Master do SURYA
DO $$
DECLARE
    v_obra_id UUID;
    v_contrato_id UUID;
BEGIN
    SELECT id INTO v_obra_id FROM obras WHERE nome ILIKE '%SURYA%' LIMIT 1;

    IF v_obra_id IS NOT NULL THEN
        -- Evitar duplicidade se rodar o script 2x
        DELETE FROM contratos_obra WHERE obra_id = v_obra_id;

        INSERT INTO contratos_obra (obra_id, cliente_nome, valor_total, data_inicio)
        VALUES (v_obra_id, 'DIMENCIONAL ENGENHARIA', 4350000.00, '2025-12-01')
        RETURNING id INTO v_contrato_id;

        INSERT INTO itens_contrato (contrato_id, descricao, unidade, quantidade_total, valor_unitario, quantidade_medida_acumulada)
        VALUES 
        (v_contrato_id, 'Subsolo', 'M³', 1230.18, 453.55, 299.27),
        (v_contrato_id, 'Terreo', 'M³', 1230.18, 306.45, 0),
        (v_contrato_id, 'Garagem 1', 'M³', 1214.69, 245.16, 0),
        (v_contrato_id, 'Garagem 2', 'M³', 1262.62, 245.16, 0),
        (v_contrato_id, 'Lazer', 'M³', 1274.54, 367.74, 0),
        (v_contrato_id, 'Tipo 1 ao 17', 'M³', 7291.81, 245.16, 0),
        (v_contrato_id, 'Barrilete', 'M³', 250.53, 367.74, 0);

        RAISE NOTICE 'Contrato e Itens do SURYA inseridos com SEGURANÇA RLS!';
    ELSE
        RAISE NOTICE 'Obra SURYA não encontrada.';
    END IF;
END $$;

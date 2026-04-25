-- 1. TORNAR EMPRESA OPCIONAL (Equipamento Global)
ALTER TABLE public.equipamentos_proprios ALTER COLUMN empresa_id DROP NOT NULL;

-- 2. CRIAR TABELA DE HISTÓRICO DE ALOCAÇÃO
CREATE TABLE IF NOT EXISTS public.historico_alocacao_equipamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipamento_id UUID REFERENCES public.equipamentos_proprios(id) ON DELETE CASCADE,
    obra_origem_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
    obra_destino_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
    data_movimentacao TIMESTAMPTZ DEFAULT now(),
    responsavel TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR RLS NA NOVA TABELA
ALTER TABLE public.historico_alocacao_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para autenticados" ON public.historico_alocacao_equipamento FOR ALL USING (true);

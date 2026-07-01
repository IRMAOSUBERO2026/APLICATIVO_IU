-- ============================================================
-- Criação da tabela ponto_apuracao_diaria
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ponto_apuracao_diaria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
    importacao_id uuid REFERENCES public.ponto_importacoes_log(id) ON DELETE SET NULL,
    nome_funcionario text,
    cpf text NOT NULL,
    pis text,
    cargo text,
    departamento text,
    cnpj_obra text,
    data date NOT NULL,
    entrada1 time without time zone,
    saida1 time without time zone,
    entrada2 time without time zone,
    saida2 time without time zone,
    entrada3 time without time zone,
    saida3 time without time zone,
    origem_batida text,
    tipo_dia text,
    total_normais numeric(5,2),
    falta_atraso numeric(5,2),
    extra_diurna numeric(5,2),
    extra_noturna numeric(5,2),
    dia_falta boolean DEFAULT false,
    justificativa text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(cpf, data)
);

-- Habilitar RLS
ALTER TABLE public.ponto_apuracao_diaria ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso genérica (ajuste conforme necessário)
CREATE POLICY "Permitir acesso total para autenticados em ponto_apuracao_diaria" 
ON public.ponto_apuracao_diaria FOR ALL TO authenticated USING (true);

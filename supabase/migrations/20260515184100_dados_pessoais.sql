-- Migration for Personal Data Phase (Fase 4)
-- Solicitações de Atualização Cadastral

CREATE TABLE IF NOT EXISTS public.solicitacoes_atualizacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    dados_novos JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovado', 'reprovado')) DEFAULT 'pendente',
    motivo_reprovacao TEXT,
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_atualizacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Colaboradores inserem proprias solicitacoes" ON public.solicitacoes_atualizacao
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = solicitacoes_atualizacao.funcionario_id
        )
    );

CREATE POLICY "Colaboradores veem proprias solicitacoes" ON public.solicitacoes_atualizacao
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = solicitacoes_atualizacao.funcionario_id
        )
    );

CREATE POLICY "RH e Admin gerenciam solicitacoes" ON public.solicitacoes_atualizacao
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_solicitacoes
BEFORE UPDATE ON public.solicitacoes_atualizacao
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

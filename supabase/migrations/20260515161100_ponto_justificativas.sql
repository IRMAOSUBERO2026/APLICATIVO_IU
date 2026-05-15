-- Migration for Point Justifications and Occurrences
-- Phase 2 of Portal do Colaborador

-- Table for justifications
CREATE TABLE IF NOT EXISTS public.justificativas_ponto (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    data_ocorrencia DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('atestado', 'esquecimento', 'viagem', 'servico_externo', 'folga', 'outro')),
    descricao TEXT,
    anexo_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovado', 'reprovado')) DEFAULT 'pendente',
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for automated occurrences (faltas, atrasos, etc)
CREATE TABLE IF NOT EXISTS public.ocorrencias_ponto (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    data_ocorrencia DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('falta', 'atraso', 'incompleto', 'extra_nao_autorizada')),
    descricao TEXT,
    penalidade_aplicada BOOLEAN NOT NULL DEFAULT false,
    justificada BOOLEAN NOT NULL DEFAULT false,
    justificativa_id UUID REFERENCES public.justificativas_ponto(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias_ponto ENABLE ROW LEVEL SECURITY;

-- Policies for justifications
-- Employees can view their own justifications
CREATE POLICY "Colaboradores veem proprias justificativas" ON public.justificativas_ponto
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = justificativas_ponto.funcionario_id
        )
    );

-- Employees can insert their own justifications
CREATE POLICY "Colaboradores inserem proprias justificativas" ON public.justificativas_ponto
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = funcionario_id
        )
    );

-- RH and Admin can view and update everything
CREATE POLICY "RH e Admin gerenciam justificativas" ON public.justificativas_ponto
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Policies for occurrences
-- Employees can view their own occurrences
CREATE POLICY "Colaboradores veem proprias ocorrencias" ON public.ocorrencias_ponto
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = ocorrencias_ponto.funcionario_id
        )
    );

-- RH and Admin can view and update everything
CREATE POLICY "RH e Admin gerenciam ocorrencias" ON public.ocorrencias_ponto
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_justificativas
BEFORE UPDATE ON public.justificativas_ponto
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_ocorrencias
BEFORE UPDATE ON public.ocorrencias_ponto
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

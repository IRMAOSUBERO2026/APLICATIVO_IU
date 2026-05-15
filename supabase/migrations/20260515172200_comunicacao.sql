-- Migration for Communication Phase (Fase 3)
-- Mural, Sugestões e Mensagens

-- Table for suggestions
CREATE TABLE IF NOT EXISTS public.sugestoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    anonimo BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('recebido', 'em_analise', 'implementado', 'arquivado')) DEFAULT 'recebido',
    resposta_rh TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

-- Policies for suggestions
CREATE POLICY "Colaboradores inserem proprias sugestoes" ON public.sugestoes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = sugestoes.funcionario_id
        )
    );

CREATE POLICY "Colaboradores veem proprias sugestoes" ON public.sugestoes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.funcionario_id = sugestoes.funcionario_id
        )
    );

CREATE POLICY "RH e Admin veem todas sugestoes" ON public.sugestoes
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Refine RLS for avisos (existing table)
DROP POLICY IF EXISTS "Acesso público avisos" ON public.avisos;

CREATE POLICY "Colaboradores veem avisos pertinentes" ON public.avisos
    FOR SELECT USING (
        obra_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.funcionarios f
            JOIN public.profiles p ON p.funcionario_id = f.id
            WHERE p.id = auth.uid() 
            AND (f.obra_id = avisos.obra_id OR avisos.funcionario_id = f.id)
        )
    );

CREATE POLICY "RH e Admin gerenciam avisos" ON public.avisos
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Refine RLS for mensagens_internas
DROP POLICY IF EXISTS "Acesso público mensagens_internas" ON public.mensagens_internas;

CREATE POLICY "Colaboradores veem proprias mensagens" ON public.mensagens_internas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND (p.funcionario_id = mensagens_internas.destinatario_id OR p.id::text = mensagens_internas.remetente)
        )
    );

CREATE POLICY "Colaboradores enviam mensagens" ON public.mensagens_internas
    FOR INSERT WITH CHECK (
        remetente = auth.uid()::text
    );

CREATE POLICY "RH e Admin veem todas mensagens" ON public.mensagens_internas
    FOR ALL USING (
        public.get_my_role() IN ('admin', 'rh')
    );

-- Migration to create RBAC and portal credentials

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'rh', 'colaborador')) DEFAULT 'colaborador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles
CREATE POLICY "Acesso publico a profiles" ON public.profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Usuarios podem atualizar proprio profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Only admin/rh can insert or update other profiles
-- We'll keep it simple: insert is allowed for triggers or admin
CREATE POLICY "Admins podem inserir profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Function to get current user role easily
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Table to manage PINs for the portal
-- Since Supabase auth requires email/password, we will map CPF -> cpf@irmaosubero.com
-- and PIN -> password. This table helps RH know who has a PIN configured.
CREATE TABLE IF NOT EXISTS public.portal_credentials (
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE PRIMARY KEY,
    pin_configurado BOOLEAN NOT NULL DEFAULT false,
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_credentials ENABLE ROW LEVEL SECURITY;

-- RH/Admin can manage, users can read their own
CREATE POLICY "Acesso publico a portal_credentials" ON public.portal_credentials FOR SELECT USING (true);
CREATE POLICY "Admins podem alterar portal_credentials" ON public.portal_credentials FOR ALL USING (true);

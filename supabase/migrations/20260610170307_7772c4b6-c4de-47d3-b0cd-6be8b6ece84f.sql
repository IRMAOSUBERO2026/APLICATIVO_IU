CREATE TABLE public.assinaturas_perfil (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid,
  funcionario_id uuid NOT NULL UNIQUE,
  assinatura_url text,
  selfie_url text,
  cpf_confirmado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas_perfil TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas_perfil TO anon;
GRANT ALL ON public.assinaturas_perfil TO service_role;

ALTER TABLE public.assinaturas_perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público assinaturas_perfil" ON public.assinaturas_perfil
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_assinaturas_perfil_updated_at
  BEFORE UPDATE ON public.assinaturas_perfil
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
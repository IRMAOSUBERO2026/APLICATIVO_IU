
-- =========================================================
-- 1. ROLE SYSTEM
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','gestor','encarregado','colaborador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','gestor','encarregado')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_funcionario_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT funcionario_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =========================================================
-- 2. PROFILES + NEW USER TRIGGER (bootstrap first admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_exists boolean;
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (NEW.id, 'colaborador')
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF NOT admin_exists THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 3. CLEAN SLATE: drop every existing policy in public schema
-- =========================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- =========================================================
-- 4. GRANTS: remove anonymous access, keep authenticated + service_role
-- =========================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =========================================================
-- 5. GENERIC STAFF-ONLY POLICIES for all tables except specially handled ones
-- =========================================================
DO $$
DECLARE t text;
DECLARE excluded text[] := ARRAY[
  'profiles','user_roles','funcionarios','avisos','entregas_epi',
  'assinaturas_perfil','assinaturas_digitais','justificativas_ponto',
  'sugestoes','solicitacoes_atualizacao'
];
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT (t = ANY(excluded)) THEN
      EXECUTE format(
        'CREATE POLICY "staff_all" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- 6. USER_ROLES policies
-- =========================================================
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 7. PROFILES policies (no self role escalation)
-- =========================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 8. FUNCIONARIOS: staff full, colaborador own record
-- =========================================================
CREATE POLICY "staff_all" ON public.funcionarios
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "funcionarios_colab_select" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (id = public.current_funcionario_id());
CREATE POLICY "funcionarios_colab_update" ON public.funcionarios
  FOR UPDATE TO authenticated
  USING (id = public.current_funcionario_id())
  WITH CHECK (id = public.current_funcionario_id());

-- =========================================================
-- 9. AVISOS: staff full, colaborador reads own + broadcast
-- =========================================================
CREATE POLICY "staff_all" ON public.avisos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "avisos_colab_select" ON public.avisos
  FOR SELECT TO authenticated
  USING (funcionario_id IS NULL OR funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 10. ENTREGAS_EPI: staff full, colaborador reads own
-- =========================================================
CREATE POLICY "staff_all" ON public.entregas_epi
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "entregas_epi_colab_select" ON public.entregas_epi
  FOR SELECT TO authenticated
  USING (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 11. ASSINATURAS_PERFIL: staff full, colaborador manages own
-- =========================================================
CREATE POLICY "staff_all" ON public.assinaturas_perfil
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "assinaturas_perfil_colab" ON public.assinaturas_perfil
  FOR ALL TO authenticated
  USING (funcionario_id = public.current_funcionario_id())
  WITH CHECK (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 12. ASSINATURAS_DIGITAIS: staff full, colaborador reads own (public token flow via edge function/service role)
-- =========================================================
CREATE POLICY "staff_all" ON public.assinaturas_digitais
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "assinaturas_digitais_colab_select" ON public.assinaturas_digitais
  FOR SELECT TO authenticated
  USING (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 13. JUSTIFICATIVAS_PONTO: staff full, colaborador own
-- =========================================================
CREATE POLICY "staff_all" ON public.justificativas_ponto
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "justificativas_colab_select" ON public.justificativas_ponto
  FOR SELECT TO authenticated
  USING (funcionario_id = public.current_funcionario_id());
CREATE POLICY "justificativas_colab_insert" ON public.justificativas_ponto
  FOR INSERT TO authenticated
  WITH CHECK (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 14. SUGESTOES: staff full, colaborador own
-- =========================================================
CREATE POLICY "staff_all" ON public.sugestoes
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "sugestoes_colab_select" ON public.sugestoes
  FOR SELECT TO authenticated
  USING (funcionario_id = public.current_funcionario_id());
CREATE POLICY "sugestoes_colab_insert" ON public.sugestoes
  FOR INSERT TO authenticated
  WITH CHECK (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 15. SOLICITACOES_ATUALIZACAO: staff full, colaborador own
-- =========================================================
CREATE POLICY "staff_all" ON public.solicitacoes_atualizacao
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "solic_atualizacao_colab_select" ON public.solicitacoes_atualizacao
  FOR SELECT TO authenticated
  USING (funcionario_id = public.current_funcionario_id());
CREATE POLICY "solic_atualizacao_colab_insert" ON public.solicitacoes_atualizacao
  FOR INSERT TO authenticated
  WITH CHECK (funcionario_id = public.current_funcionario_id());

-- =========================================================
-- 16. FIX SECURITY DEFINER VIEW
-- =========================================================
ALTER VIEW public.vw_ponto_consolidado SET (security_invoker = on);

-- =========================================================
-- 17. STORAGE: make documentos bucket staff-only
-- =========================================================
DROP POLICY IF EXISTS "Acesso público delete documentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público select documentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público upload documentos" ON storage.objects;

CREATE POLICY "documentos_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.is_staff(auth.uid()));
CREATE POLICY "documentos_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.is_staff(auth.uid()));
CREATE POLICY "documentos_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'documentos' AND public.is_staff(auth.uid()));
CREATE POLICY "documentos_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.is_staff(auth.uid()));

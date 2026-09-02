CREATE TABLE IF NOT EXISTS public.ponto_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  serial_numero VARCHAR(20) UNIQUE NOT NULL,
  modelo VARCHAR(50),
  descricao VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_equipamentos TO authenticated;
GRANT ALL ON public.ponto_equipamentos TO service_role;
ALTER TABLE public.ponto_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ponto equipamentos staff" ON public.ponto_equipamentos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ponto_batidas_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID REFERENCES public.ponto_equipamentos(id),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  pis VARCHAR(11),
  timestamp_batida TIMESTAMPTZ NOT NULL,
  tipo_registro VARCHAR(20) NOT NULL,
  obra_id_batida UUID REFERENCES public.obras(id),
  e_deslocamento BOOLEAN DEFAULT false,
  sequencia_afd INTEGER,
  hash_verificacao VARCHAR(10),
  arquivo_origem VARCHAR(100),
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  importado_por UUID REFERENCES auth.users(id),
  UNIQUE(sequencia_afd, equipamento_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_batidas_raw TO authenticated;
GRANT ALL ON public.ponto_batidas_raw TO service_role;
ALTER TABLE public.ponto_batidas_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ponto batidas staff" ON public.ponto_batidas_raw FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ponto_importacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID REFERENCES public.ponto_equipamentos(id),
  obra_id UUID REFERENCES public.obras(id),
  arquivo_nome VARCHAR(100),
  periodo_inicio DATE,
  periodo_fim DATE,
  total_registros INTEGER,
  registros_biometricos INTEGER,
  pis_desconhecidos INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'concluido',
  erros TEXT,
  hash_arquivo VARCHAR(64),
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  importado_por UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_importacoes_log TO authenticated;
GRANT ALL ON public.ponto_importacoes_log TO service_role;
ALTER TABLE public.ponto_importacoes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ponto importacoes staff" ON public.ponto_importacoes_log FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_batidas_funcionario ON public.ponto_batidas_raw(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_batidas_pis ON public.ponto_batidas_raw(pis);
CREATE INDEX IF NOT EXISTS idx_batidas_timestamp ON public.ponto_batidas_raw(timestamp_batida);
CREATE INDEX IF NOT EXISTS idx_importacoes_hash ON public.ponto_importacoes_log(hash_arquivo);
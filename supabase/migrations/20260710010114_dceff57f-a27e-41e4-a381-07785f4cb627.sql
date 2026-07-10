CREATE TABLE public.salarios_base_cargo_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo TEXT NOT NULL,
  acao TEXT NOT NULL,
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  usuario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.salarios_base_cargo_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salarios_base_cargo_log TO authenticated;
GRANT ALL ON public.salarios_base_cargo_log TO service_role;

ALTER TABLE public.salarios_base_cargo_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Log de salários é público para leitura"
  ON public.salarios_base_cargo_log FOR SELECT USING (true);

CREATE POLICY "Log de salários pode ser inserido"
  ON public.salarios_base_cargo_log FOR INSERT WITH CHECK (true);
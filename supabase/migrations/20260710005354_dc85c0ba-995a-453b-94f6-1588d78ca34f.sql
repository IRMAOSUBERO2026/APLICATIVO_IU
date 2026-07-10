CREATE TABLE public.salarios_base_cargo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo TEXT NOT NULL UNIQUE,
  salario_base NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salarios_base_cargo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salarios_base_cargo TO anon;
GRANT ALL ON public.salarios_base_cargo TO service_role;

ALTER TABLE public.salarios_base_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público salarios_base_cargo"
ON public.salarios_base_cargo
FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_salarios_base_cargo_updated_at
BEFORE UPDATE ON public.salarios_base_cargo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.salarios_base_cargo (cargo, salario_base) VALUES
('Carpinteiro I', 2600),('Carpinteiro II', 2750),('Carpinteiro III', 2900),
('1/2 Oficial de Carpinteiro', 2100),('Encarregado de Carpintaria I', 3400),
('Encarregado de Carpintaria II', 3700),('Encarregado de Carpintaria III', 4000),
('Armador I', 2600),('Armador II', 2750),('Armador III', 2900),
('1/2 Oficial de Armador', 2100),('Encarregado de Armação I', 3400),
('Encarregado de Armação II', 3700),('Encarregado de Armação III', 4000),
('Servente', 1800),('Pedreiro', 2500),('Operador de Grua', 3200),
('Operador de Cremalheira', 2600),('Almoxarife', 2300),('Auxiliar Administrativo', 2000),
('Encarregado de Obras I', 3600),('Encarregado de Obras II', 3900),('Encarregado de Obras III', 4200),
('Mestre de Obras', 4800),('Engenheiro Civil', 8000),('Estagiário', 1400),
('Apontador', 2200),('Vigia', 1900),('Motorista', 2400)
ON CONFLICT (cargo) DO NOTHING;
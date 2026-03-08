
CREATE TABLE public.folhas_pagamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes integer NOT NULL,
  ano integer NOT NULL,
  
  -- Input data
  salario_registro numeric NOT NULL DEFAULT 0,
  salario_combinado numeric NOT NULL DEFAULT 0,
  dias_do_mes integer NOT NULL DEFAULT 30,
  domingos_feriados_no_mes integer NOT NULL DEFAULT 4,
  usar_salario_sindicato_para_he boolean NOT NULL DEFAULT true,
  
  horas_extras_semanais numeric NOT NULL DEFAULT 0,
  horas_extras_sabado numeric NOT NULL DEFAULT 0,
  horas_extras_100 numeric NOT NULL DEFAULT 0,
  horas_negativas numeric NOT NULL DEFAULT 0,
  
  faltas integer NOT NULL DEFAULT 0,
  atestados integer NOT NULL DEFAULT 0,
  semanas_com_falta integer NOT NULL DEFAULT 0,
  
  bonificacao_meta numeric NOT NULL DEFAULT 0,
  bonificacao_assiduidade numeric NOT NULL DEFAULT 0,
  
  desconto_marmita numeric NOT NULL DEFAULT 0,
  desconto_vale numeric NOT NULL DEFAULT 0,
  desconto_emprestimo numeric NOT NULL DEFAULT 0,
  outros_descontos numeric NOT NULL DEFAULT 0,
  
  -- Calculated output
  base_dia numeric NOT NULL DEFAULT 0,
  base_hora numeric NOT NULL DEFAULT 0,
  he_semanal numeric NOT NULL DEFAULT 0,
  he_sabado numeric NOT NULL DEFAULT 0,
  he_100 numeric NOT NULL DEFAULT 0,
  total_he numeric NOT NULL DEFAULT 0,
  dsr_he numeric NOT NULL DEFAULT 0,
  valor_atestados numeric NOT NULL DEFAULT 0,
  desconto_faltas numeric NOT NULL DEFAULT 0,
  desconto_horas_negativas numeric NOT NULL DEFAULT 0,
  dsr_perdido numeric NOT NULL DEFAULT 0,
  total_bonificacoes numeric NOT NULL DEFAULT 0,
  total_descontos numeric NOT NULL DEFAULT 0,
  salario_final numeric NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(funcionario_id, mes, ano)
);

ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público folhas_pagamento" ON public.folhas_pagamento FOR ALL USING (true) WITH CHECK (true);


-- Add tipo_remuneracao to funcionarios
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS tipo_remuneracao text NOT NULL DEFAULT 'mensal';
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS escala text NOT NULL DEFAULT '5x2';

-- Add new fields to folhas_pagamento for production, encargos and enhanced tracking
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS tipo_remuneracao text NOT NULL DEFAULT 'mensal';
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS valor_producao numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS desconto_sindicato numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS desconto_adiantamento numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS qtd_marmitas integer NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS valor_marmita_unitario numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS fgts numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS inss_empresa numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS custo_total_empresa numeric NOT NULL DEFAULT 0;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS status_folha text NOT NULL DEFAULT 'aberto';
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS bonificacao_justificativa text;
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS is_simulacao boolean NOT NULL DEFAULT false;

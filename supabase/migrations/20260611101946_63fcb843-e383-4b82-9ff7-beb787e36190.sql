ALTER TABLE public.entregas_epi
  ADD COLUMN IF NOT EXISTS foto_entrega_url TEXT,
  ADD COLUMN IF NOT EXISTS local_entrega TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrega TIMESTAMPTZ;
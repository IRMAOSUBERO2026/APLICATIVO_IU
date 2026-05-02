ALTER TABLE public.medicoes ADD COLUMN IF NOT EXISTS data_previsao_recebimento date;
NOTIFY pgrst, 'reload schema';
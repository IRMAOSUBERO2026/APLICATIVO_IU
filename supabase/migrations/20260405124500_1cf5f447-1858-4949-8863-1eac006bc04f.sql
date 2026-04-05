
-- Fix: drop old check constraint that blocks pipeline status values
ALTER TABLE public.obras DROP CONSTRAINT IF EXISTS obras_status_check;

-- Add categoria column to medicao_contrato_itens for administrative items
ALTER TABLE public.medicao_contrato_itens ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'servico';

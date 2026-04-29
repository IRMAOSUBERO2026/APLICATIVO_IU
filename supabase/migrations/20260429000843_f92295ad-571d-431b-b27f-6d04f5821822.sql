CREATE UNIQUE INDEX IF NOT EXISTS funcionarios_empresa_cpf_unico_idx
ON public.funcionarios (
  empresa_id,
  regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g')
)
WHERE regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS funcionarios_empresa_numero_registro_unico_idx
ON public.funcionarios (
  empresa_id,
  upper(regexp_replace(coalesce(numero_registro, ''), '[^A-Za-z0-9]', '', 'g'))
)
WHERE trim(coalesce(numero_registro, '')) <> '';
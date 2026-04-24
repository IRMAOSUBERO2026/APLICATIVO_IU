-- ============================================================
-- SCRIPT: RESET CONTROLADO + SEED DE DADOS DE TESTE
-- MÓDULOS: EMPRESAS + OBRAS
-- AMBIENTE: DESENVOLVIMENTO / TESTES APENAS
-- DATA: 2026-04-10
-- ============================================================
-- ⚠️  ATENÇÃO: NUNCA EXECUTAR EM PRODUÇÃO
-- ============================================================

DO $$
DECLARE
  v_inicio        TIMESTAMPTZ := now();
  v_empresa_1_id  UUID;
  v_empresa_2_id  UUID;
  v_empresa_3_id  UUID;
  v_total_emp     INTEGER := 0;
  v_total_obras   INTEGER := 0;
BEGIN

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'INÍCIO DO PROCESSO - %', v_inicio;
  RAISE NOTICE '============================================================';

  -- ============================================================
  -- ETAPA 01 — BACKUP RÁPIDO (registra contagem antes do reset)
  -- ============================================================
  RAISE NOTICE '[BACKUP] Contando registros antes da limpeza...';
  SELECT COUNT(*) INTO v_total_emp   FROM public.empresas;
  SELECT COUNT(*) INTO v_total_obras FROM public.obras;
  RAISE NOTICE '[BACKUP] Empresas existentes antes do reset: %', v_total_emp;
  RAISE NOTICE '[BACKUP] Obras existentes antes do reset:    %', v_total_obras;

  -- ============================================================
  -- ETAPA 01 — LIMPEZA (ordem: dependentes → obras → empresas)
  -- ============================================================
  RAISE NOTICE '[LIMPEZA] Iniciando remoção de dados dependentes...';

  -- Tabelas que dependem de funcionarios
  DELETE FROM public.assinaturas_digitais WHERE funcionario_id IN (SELECT id FROM public.funcionarios);
  RAISE NOTICE '[LIMPEZA] assinaturas_digitais: OK';

  -- Tabelas que dependem de obras (com CASCADE automático, mas explicitamos para clareza)
  DELETE FROM public.medicao_boletim_itens WHERE medicao_id IN (SELECT id FROM public.medicoes);
  RAISE NOTICE '[LIMPEZA] medicao_boletim_itens: OK';

  DELETE FROM public.medicao_retencoes_impostos WHERE medicao_id IN (SELECT id FROM public.medicoes);
  RAISE NOTICE '[LIMPEZA] medicao_retencoes_impostos: OK';

  DELETE FROM public.medicoes;
  RAISE NOTICE '[LIMPEZA] medicoes: OK';

  DELETE FROM public.medicao_contrato_itens;
  RAISE NOTICE '[LIMPEZA] medicao_contrato_itens: OK';

  DELETE FROM public.medicao_reajustes;
  RAISE NOTICE '[LIMPEZA] medicao_reajustes: OK';

  DELETE FROM public.orcamento_itens WHERE orcamento_id IN (SELECT id FROM public.orcamentos);
  RAISE NOTICE '[LIMPEZA] orcamento_itens: OK';

  DELETE FROM public.orcamentos;
  RAISE NOTICE '[LIMPEZA] orcamentos: OK';

  DELETE FROM public.servicos_extras;
  RAISE NOTICE '[LIMPEZA] servicos_extras: OK';

  DELETE FROM public.diarios_obra;
  RAISE NOTICE '[LIMPEZA] diarios_obra: OK';

  DELETE FROM public.movimentacoes_estoque WHERE obra_id IS NOT NULL;
  RAISE NOTICE '[LIMPEZA] movimentacoes_estoque (vinculadas a obras): OK';

  DELETE FROM public.itens_compra WHERE compra_id IN (SELECT id FROM public.compras);
  RAISE NOTICE '[LIMPEZA] itens_compra: OK';

  DELETE FROM public.compras;
  RAISE NOTICE '[LIMPEZA] compras: OK';

  DELETE FROM public.contas_pagar;
  RAISE NOTICE '[LIMPEZA] contas_pagar: OK';

  DELETE FROM public.contas_receber;
  RAISE NOTICE '[LIMPEZA] contas_receber: OK';

  DELETE FROM public.equipamentos_proprios;
  RAISE NOTICE '[LIMPEZA] equipamentos_proprios: OK';

  DELETE FROM public.solicitacoes_compra_equipamento;
  RAISE NOTICE '[LIMPEZA] solicitacoes_compra_equipamento: OK';

  DELETE FROM public.equipamentos_locados;
  RAISE NOTICE '[LIMPEZA] equipamentos_locados: OK';

  -- Documentos e folhas de funcionários
  DELETE FROM public.documentos_funcionario;
  RAISE NOTICE '[LIMPEZA] documentos_funcionario: OK';

  -- Folhas de pagamento (depende de funcionarios/empresa)
  DELETE FROM public.folhas_pagamento;
  RAISE NOTICE '[LIMPEZA] folhas_pagamento: OK';

  -- Funcionários
  DELETE FROM public.funcionarios;
  RAISE NOTICE '[LIMPEZA] funcionarios: OK';

  -- Obras
  DELETE FROM public.obras;
  RAISE NOTICE '[LIMPEZA] obras: OK';

  -- Empresas
  DELETE FROM public.empresas;
  RAISE NOTICE '[LIMPEZA] empresas: OK';

  RAISE NOTICE '[LIMPEZA] Limpeza concluída com sucesso!';

  -- ============================================================
  -- ETAPA 02 — CADASTRO DE EMPRESAS
  -- ============================================================
  RAISE NOTICE '[EMPRESAS] Inserindo empresas...';

  -- Empresa 1: MARCOS PAULO GOMEZ UBERO
  INSERT INTO public.empresas (
    id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'MARCOS PAULO GOMEZ UBERO',
    'MARCOS PAULO GOMEZ UBERO',
    '31.370.964/0001-55',
    true,
    now(),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE
    SET razao_social = EXCLUDED.razao_social,
        updated_at   = now()
  RETURNING id INTO v_empresa_1_id;

  RAISE NOTICE '[EMPRESAS] Empresa 1 criada: ID = %', v_empresa_1_id;

  -- Empresa 2: IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MÃO DE OBRA
  INSERT INTO public.empresas (
    id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA',
    'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA',
    '51.647.127/0001-38',
    true,
    now(),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE
    SET razao_social = EXCLUDED.razao_social,
        updated_at   = now()
  RETURNING id INTO v_empresa_2_id;

  RAISE NOTICE '[EMPRESAS] Empresa 2 criada: ID = %', v_empresa_2_id;

  -- Empresa 3: IRMÃOS UBERO ENGENHARIA LTDA
  INSERT INTO public.empresas (
    id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'IRMAOS UBERO ENGENHARIA LTDA',
    'IRMAOS UBERO ENGENHARIA LTDA',
    '15.595.310/0001-73',
    true,
    now(),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE
    SET razao_social = EXCLUDED.razao_social,
        updated_at   = now()
  RETURNING id INTO v_empresa_3_id;

  RAISE NOTICE '[EMPRESAS] Empresa 3 criada: ID = %', v_empresa_3_id;

  -- ============================================================
  -- ETAPA 03 — CADASTRO DE OBRAS
  -- ============================================================
  RAISE NOTICE '[OBRAS] Inserindo obras...';

  -- 1. ATMOS SKY → CNPJ 31.370.964/0001-55 → empresa_1
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_1_id, 'OBRA-001', 'ATMOS SKY', 'CEG', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-001 ATMOS SKY: OK';

  -- 2. MAISON LAFAYETTE → CNPJ 31.370.964/0001-55 → empresa_1
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_1_id, 'OBRA-002', 'MAISON LAFAYETTE', 'DALLO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-002 MAISON LAFAYETTE: OK';

  -- 3. JK 399 → CNPJ 31.370.964/0001-55 → empresa_1
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_1_id, 'OBRA-003', 'JK 399', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-003 JK 399: OK';

  -- 4. OCEAN WIND → CNPJ 31.370.964/0001-55 → empresa_1
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_1_id, 'OBRA-004', 'OCEAN WIND', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-004 OCEAN WIND: OK';

  -- 5. JASPE RESIDENCE → CNPJ 51.647.127/0001-38 → empresa_2
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-005', 'JASPE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-005 JASPE RESIDENCE: OK';

  -- 6. CELESTINA → CNPJ 51.647.127/0001-38 → empresa_2
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-006', 'CELESTINA', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-006 CELESTINA: OK';

  -- 7. CITRINO PALACE RESIDENCE → sem CNPJ definido → empresa_2 (grupo principal)
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-007', 'CITRINO PALACE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-007 CITRINO PALACE RESIDENCE: OK';

  -- 8. CASA ATALAIA 47 → CNPJ 31.370.964/0001-55 → empresa_1
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_1_id, 'OBRA-008', 'CASA ATALAIA 47', 'MACODESC', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-008 CASA ATALAIA 47: OK';

  -- 9. SAINT LOUIS → CNPJ 51.647.127/0001-38 → empresa_2
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-009', 'SAINT LOUIS', 'DALLO', 'PORTO BELO', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-009 SAINT LOUIS: OK';

  -- 10. TERRACE 36 → CNPJ 15.595.310/0001-73 → empresa_3
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_3_id, 'OBRA-010', 'TERRACE 36', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-010 TERRACE 36: OK';

  -- 11. BRAVA OCEAN → CNPJ 15.595.310/0001-73 → empresa_3
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_3_id, 'OBRA-011', 'BRAVA OCEAN', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-011 BRAVA OCEAN: OK';

  -- 12. IOS RESIDENCIAL → CNPJ 51.647.127/0001-38 → empresa_2
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-012', 'IOS RESIDENCIAL', 'PEGORIM ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-012 IOS RESIDENCIAL: OK';

  -- 13. SURYA → CNPJ 51.647.127/0001-38 → empresa_2
  INSERT INTO public.obras (
    empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at
  ) VALUES (
    v_empresa_2_id, 'OBRA-013', 'SURYA', 'DIMENCIONAL ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now()
  );
  RAISE NOTICE '[OBRAS] OBRA-013 SURYA: OK';

  -- ============================================================
  -- VALIDAÇÕES FINAIS
  -- ============================================================
  SELECT COUNT(*) INTO v_total_emp   FROM public.empresas;
  SELECT COUNT(*) INTO v_total_obras FROM public.obras;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'LOG FINAL DA OPERAÇÃO';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Data/Hora de início:      %', v_inicio;
  RAISE NOTICE 'Data/Hora de conclusão:   %', now();
  RAISE NOTICE 'Total de empresas criadas: %', v_total_emp;
  RAISE NOTICE 'Total de obras criadas:    %', v_total_obras;

  IF v_total_emp = 3 AND v_total_obras = 13 THEN
    RAISE NOTICE 'Status: ✅ SUCESSO';
  ELSE
    RAISE EXCEPTION 'Status: ❌ ERRO — Contagem incorreta (esperado: 3 empresas, 13 obras | obtido: % empresas, % obras)',
      v_total_emp, v_total_obras;
  END IF;

  -- Conferência de vínculos
  RAISE NOTICE '--- Verificando vínculos empresa → obra ---';
  RAISE NOTICE 'Obras sem empresa vinculada: %', (SELECT COUNT(*) FROM public.obras WHERE empresa_id IS NULL);
  RAISE NOTICE 'Obras em andamento:          %', (SELECT COUNT(*) FROM public.obras WHERE status = ''em_andamento'');
  RAISE NOTICE 'Obras concluídas:            %', (SELECT COUNT(*) FROM public.obras WHERE status = ''concluida'');
  RAISE NOTICE '============================================================';

END $$;

-- ============================================================
-- CONSULTA DE CONFIRMAÇÃO — Execute para conferir os dados
-- ============================================================

-- Empresas cadastradas
SELECT
  razao_social  AS empresa,
  cnpj,
  ativo,
  created_at
FROM public.empresas
ORDER BY razao_social;

-- Obras cadastradas com vínculo de empresa
SELECT
  o.codigo,
  o.nome       AS obra,
  o.construtora AS cliente,
  o.cidade,
  o.status,
  o.data_inicio,
  e.razao_social AS empresa_responsavel,
  e.cnpj
FROM public.obras o
JOIN public.empresas e ON e.id = o.empresa_id
ORDER BY o.codigo;

-- ============================================================
-- SCRIPT: IMPORTAÇÃO REALIDADE TOTAL - PROJETO 03 (dtxqpjvmvsdkhatyapbb)
-- CONSOLIDADO: EMPRESAS + OBRAS + FUNCIONÁRIOS + ALOCAÇÕES
-- MODELO: Vínculo via tabela public.alocacoes
-- ============================================================

DO $$
DECLARE
    v_inicio        TIMESTAMPTZ := now();
    v_emp_31_id     UUID; 
    v_emp_51_id     UUID; 
    v_emp_15_id     UUID; 
    v_obra_id       UUID;
    v_func_id       UUID;
    v_count_f       INTEGER := 0;
    v_count_a       INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'INÍCIO DA IMPORTAÇÃO PROJETO 03 - %', v_inicio;
    RAISE NOTICE '============================================================';

    -- ETAPA 1: LIMPEZA RADICAL (Respeitando as tabelas existentes no Projeto 03)
    RAISE NOTICE '[LIMPEZA] Removendo dados anteriores...';
    TRUNCATE public.alocacoes, public.diarios_obra, public.compras, public.compra_itens, public.estoque_movimentacoes, public.entregas_epi, public.solicitacoes, public.diario_presencas, public.diario_atividades CASCADE;
    DELETE FROM public.funcionarios;
    DELETE FROM public.obras;
    DELETE FROM public.empresas;

    -- ETAPA 2: EMPRESAS
    RAISE NOTICE '[EMPRESAS] Cadastrando empresas do grupo...';
    
    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj)
    VALUES ('MARCOS PAULO GOMEZ UBERO', 'MARCOS PAULO GOMEZ UBERO', '31.370.964/0001-55')
    RETURNING id INTO v_emp_31_id;

    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj)
    VALUES ('IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', 'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', '51.647.127/0001-38')
    RETURNING id INTO v_emp_51_id;

    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj)
    VALUES ('IRMAOS UBERO ENGENHARIA LTDA', 'IRMAOS UBERO ENGENHARIA LTDA', '15.595.310/0001-73')
    RETURNING id INTO v_emp_15_id;

    -- ETAPA 3: OBRAS (Usando 'nome_obra' conforme schema do Proj 03)
    RAISE NOTICE '[OBRAS] Cadastrando 13 obras oficiais...';
    
    INSERT INTO public.obras (empresa_id, nome_obra, cliente, cidade, estado, status, data_inicio) VALUES
    (v_emp_31_id, 'ATMOS SKY', 'CEG', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'MAISON LAFAYETTE', 'DALLO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'JK 399', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'OCEAN WIND', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'JASPE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'CELESTINA', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'CITRINO PALACE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'CASA ATALAIA 47', 'MACODESC', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'SAINT LOUIS', 'DALLO', 'PORTO BELO', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_15_id, 'TERRACE 360', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_15_id, 'BRAVA OCEAN', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'IOS RESIDENCIAL', 'PEGORIM ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'SURYA', 'DIMENCIONAL ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01');

    -- ETAPA 4: FUNCIONÁRIOS + ALOCAÇÕES
    RAISE NOTICE '[FUNCIONARIOS] Importando 95 colaboradores e gerando alocações...';

    -- 65 | AFONSO CARLOS CORREA GARCIA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('AFONSO CARLOS CORREA GARCIA', v_emp_31_id, 'ITAJAI', '2020-11-27', 'ENCARREGADO DE OBRAS', '1961-12-03', '(47) 99787-7106', '00.681.014-8', '215.686.343-15', 2994.0, 2994.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2020-11-27'); END IF;

    -- 164 | WANDERSON JOSE NUNES DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('WANDERSON JOSE NUNES DE JESUS', v_emp_51_id, 'PORTO BELO', '2021-07-24', 'CARPINTEIRO', '1997-05-23', '(47) 997910566', '04.022.917-3', '131.778.284-40', 3393.52, 6000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2021-07-24'); END IF;

    -- 180 | MIGUEL MAMBERG VATRIN
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MIGUEL MAMBERG VATRIN', v_emp_15_id, 'ITAJAI', '2021-11-01', 'CARPINTEIRO', '1963-10-03', '(47) 992258361', '00.353.191-2', '920.341.109-78', 2556.0, 5000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2021-11-01'); END IF;

    -- 213 | VALDECIR NEGELSKI
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('VALDECIR NEGELSKI', v_emp_31_id, 'ITAJAI', '2022-01-13', 'CARPINTEIRO', '1972-05-10', '(46) 999336886', '7992.711.491-5', '799.271.149-15', 2556.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2022-01-13'); END IF;

    -- 257 | MATHEUS ARAUJO MOHR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MATHEUS ARAUJO MOHR', v_emp_31_id, 'ITAJAI', '2022-03-01', 'OPERADOR DE GRUA', '2003-12-10', '(41) 998740180', '14.252.358-2', '117.108.199-52', 2556.0, 3300.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2022-03-01'); END IF;

    -- 264 | MARCOS PEREIRA DE LIMA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MARCOS PEREIRA DE LIMA', v_emp_15_id, 'ITAJAI', '2022-03-09', 'SERVENTE', '1968-01-09', '(81) 989784095', '4628.908.940-4', '462.890.894-04', 1854.0, 2800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2022-03-09'); END IF;

    -- 426 | CELSO DE DEUS (Geral)
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('CELSO DE DEUS', v_emp_31_id, 'ITAJAI', '2022-08-01', 'ENCARREGADO DE OBRAS', '1953-09-01', '(47) 988736803', '12R1611952', '183.352.769-00', 2994.0, 6000.0, 'ativo');

    -- 421 | JONEKSON JOÃO OLIVEIRA DA CUNHA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JONEKSON JOÃO OLIVEIRA DA CUNHA', v_emp_31_id, 'ITAJAI', '2022-08-01', 'CARPINTEIRO', '1971-03-26', '(47) 997437050', '00.234.702-3', '414.728.372-15', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2022-08-01'); END IF;

    -- 516 | JUAREZ MOTTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JUAREZ MOTTA', v_emp_15_id, 'ITAJAI', '2023-02-02', 'ENCARREGADO DE OBRAS', '1988-03-12', '(41) 985242973', '10.172.173-6', '063.920.949-11', 3958.35, 8500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2023-02-02'); END IF;

    -- 531 | JOÃO VALDEVINO KLEIN DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOÃO VALDEVINO KLEIN DA SILVA', v_emp_31_id, 'ITAJAI', '2023-02-14', 'ARMADOR', '1966-05-26', '(47) 997795810', '00.396.583-9', '723.829.379-04', 2556.0, 2411.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2023-02-14'); END IF;

    -- 581 | LUCAS DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUCAS DE SOUZA', v_emp_15_id, 'ITAJAI', '2023-06-20', 'CARPINTEIRO', '2001-03-13', '(47) 996762381', '00.770.539-2', '127.114.189-28', 2556.0, 3500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2023-06-20'); END IF;

    -- 622 | ELENO EMILIO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ELENO EMILIO', v_emp_31_id, 'ITAJAI', '2023-11-14', 'CARPINTEIRO', '1971-09-15', '(47) 997545502', '00.199.683-3', '645.276.119-68', 2556.0, 2411.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2023-11-14'); END IF;

    -- 637 | JESSICA MADEIRO DA COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JESSICA MADEIRO DA COSTA', v_emp_15_id, 'ITAJAI', '2024-01-10', 'OPERADOR DE CREMALHEIRA', '1992-03-27', '(47) 997747738', '00.563.893-0', '080.824.089-79', 2556.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-01-10'); END IF;

    -- 641 | ALEXSON FERREIRA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ALEXSON FERREIRA RODRIGUES', v_emp_31_id, 'ITAJAI', '2024-01-15', 'CARPINTEIRO', '1978-08-07', '(92) 995278787', '6335.323.729-1', '633.532.372-91', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-01-15'); END IF;

    -- 642 | JOÃO JORDAN BRASIL PINTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'ATMOS SKY' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOÃO JORDAN BRASIL PINTO', v_emp_31_id, 'ITAJAI', '2024-01-15', 'ARMADOR', '1996-07-20', '(92) 993648110', '03.174.416-8', '702.549.772-00', 2556.0, 2556.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-01-15'); END IF;

    -- 644 | LUIS FERNANDO VILAR PEREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUIS FERNANDO VILAR PEREIRA', v_emp_31_id, 'ITAJAI', '2024-01-15', 'CARPINTEIRO', '1990-02-04', '(47) 984178123', '33956.342.007-6', '042.363.663-47', 1854.0, 3500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-01-15'); END IF;

    -- 670 | NELSON SOUSA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('NELSON SOUSA DA SILVA', v_emp_15_id, 'ITAJAI', '2024-03-20', 'PEDREIRO', '1993-04-04', '(91) 98507-7786', '00.057.464-7', '024.513.182-52', 2556.0, 4300.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-03-20'); END IF;

    -- 686 | RONALDO SANTOS DE SANTANA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('RONALDO SANTOS DE SANTANA', v_emp_51_id, 'PORTO BELO', '2024-05-14', 'CARPINTEIRO', '1995-10-20', '(47) 989058781', 'MG19057483', '073.285.805-42', 3393.52, 4900.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-05-14'); END IF;

    -- 699 | LEONARDO FERREIRA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LEONARDO FERREIRA DA SILVA', v_emp_51_id, 'ITAJAI', '2024-06-12', 'CARPINTEIRO', '1996-06-20', '(16) 993325939', '45.851.307-6', '235.886.068-90', 1854.0, 2800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-06-12'); END IF;

    -- 710 | LUCAS VARGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'MAISON LAFAYETTE' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUCAS VARGAS', v_emp_31_id, 'ITAPEMA', '2024-07-24', 'SERVENTE', '1999-07-16', '(47) 997273270', '1223.609.197-4', '122.360.919-74', 2003.4, 2003.4, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-07-24'); END IF;

    -- 711 | MARCO ANTONIO WUST
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MARCO ANTONIO WUST', v_emp_51_id, 'PORTO BELO', '2024-08-01', 'CARPINTEIRO', '1976-05-01', '(47) 992227781', '106.661.510-3', '912.149.040-68', 3393.52, 4850.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-08-01'); END IF;

    -- 38 | JOSIAS MOTTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOSIAS MOTTA', v_emp_51_id, 'ITAJAI', '2024-08-27', 'ENCARREGADO DE OBRAS', '1982-07-05', '(47) 984023301', '08.862.228-6', '041.236.179-56', 2994.0, 7500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-08-27'); END IF;

    -- 722 | RODRIGO VILELA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('RODRIGO VILELA DA SILVA', v_emp_15_id, 'ITAJAI', '2024-09-04', 'CARPINTEIRO', '1989-07-09', '(47) 991999279', '00.804.328-7', '016.721.830-14', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-09-04'); END IF;

    -- 102 | ADENILSON SOARES CHAGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ADENILSON SOARES CHAGAS', v_emp_15_id, 'ITAJAI', '2024-10-07', 'CARPINTEIRO', '1982-04-24', '(47) 996867904', '00.838.667-1', '055.835.679-61', 3393.52, 6500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-10-07'); END IF;

    -- 46 | JOANILSON DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOANILSON DE OLIVEIRA', v_emp_51_id, 'PORTO BELO', '2024-10-10', 'CARPINTEIRO', '1971-01-16', '(49) 999497527', '673.549.690-6', '067.354.969-06', 3393.52, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2024-10-10'); END IF;

    -- 4 | VALDEMIRO MOHR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('VALDEMIRO MOHR', v_emp_51_id, 'ITAJAI', '2025-01-07', 'ENCARREGADO DE OBRAS', '1981-12-14', '(41) 988842163', '04.690.026-8', '053.220.169-88', 2994.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-07'); END IF;

    -- 6 | JEAN JUDE MEUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JEAN JUDE MEUS', v_emp_15_id, 'ITAJAI', '2025-01-13', 'ARMADOR', '1990-09-23', '(47) 999580661', 'V876480S', '062.119.867-69', 1823.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-13'); END IF;

    -- 7 | ROBERTO PEREIRA DA CONCEIÇÃO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ROBERTO PEREIRA DA CONCEIÇÃO', v_emp_15_id, 'ITAJAI', '2025-01-13', 'SERVENTE', '1982-05-13', '(11) 983427957', '00.513.007-7', '443.436.738-20', 1749.0, 2800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-13'); END IF;

    -- 730 | GILBERTO LIMA DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('GILBERTO LIMA DE JESUS', v_emp_31_id, 'ITAJAI', '2025-01-21', 'PEDREIRO', '1990-03-11', '(75)991882115', '157.331.024-7', '052.689.815-10', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-21'); END IF;

    -- 53 | WASHINGTON DE SANTANA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('WASHINGTON DE SANTANA SILVA', v_emp_51_id, 'PORTO BELO', '2025-01-21', 'CARPINTEIRO', '1986-09-01', '(08) 199164801', '747.640.440-8', '074.764.044-05', 3393.52, 4700.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-21'); END IF;

    -- 52 | JOSÉ ROGERIO DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOSÉ ROGERIO DOS SANTOS', v_emp_51_id, 'PORTO BELO', '2025-01-21', 'CARPINTEIRO', '1988-10-15', '(47) 997106671', '00.776.862-0', '079.294.159-45', 3393.52, 5000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-21'); END IF;

    -- 732 | EVERTON SANTOS DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('EVERTON SANTOS DA SILVA', v_emp_31_id, 'ITAJAI', '2025-01-22', 'PEDREIRO', '1979-10-21', '(47)992629257', '21.819.157-0', '002.181.915-70', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-01-22'); END IF;

    -- 748 | MILTON HUMBERTO DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MILTON HUMBERTO DOS SANTOS', v_emp_31_id, 'ITAJAI', '2025-02-26', 'PEDREIRO', '1960-10-23', '(47) 999920571', '00.672.296-2', '656.957.124-91', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-02-26'); END IF;

    -- 14 | LINDEMBERG ARAUJO DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LINDEMBERG ARAUJO DA SILVA', v_emp_15_id, 'ITAJAI', '2025-03-03', 'CARPINTEIRO', '1996-09-04', '(84) 999745504', '00.334.507-3', '700.913.574-62', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-03-03'); END IF;

    -- 13 | JOHN JEFFERSON MESY
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOHN JEFFERSON MESY', v_emp_15_id, 'ITAJAI', '2025-03-03', 'SERVENTE', '1995-09-26', '(47) 996327375', 'RNM F396340A', '801.740.749-13', 1749.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-03-03'); END IF;

    -- 749 | YASEL OSCAR LOPES LIENS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('YASEL OSCAR LOPES LIENS', v_emp_15_id, 'ITAJAI', '2025-03-10', 'PEDREIRO', '1990-12-03', '(47) 992297957', 'RNMB241789L', '026.821.849-87', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-03-10'); END IF;

    -- 750 | LUIZ CARLOS DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUIZ CARLOS DOS SANTOS', v_emp_31_id, 'ITAJAI', '2025-03-13', 'PEDREIRO', '1970-07-06', '(47) 999338876', '00.559.200-5', '712.486.684-72', 2556.0, 4000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-03-13'); END IF;

    -- 17 | ADEMIR RIBEIRO COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ADEMIR RIBEIRO COUTO', v_emp_15_id, 'ITAJAI', '2025-04-09', 'ARMADOR', '1972-03-30', '(47) 999646712', '00.226.531-6', '043.599.269-44', 2556.0, 5500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-04-09'); END IF;

    -- 18 | ADEMIR RIBEIRO COUTO JUNIOR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ADEMIR RIBEIRO COUTO JUNIOR', v_emp_15_id, 'ITAJAI', '2025-04-09', 'ARMADOR', '2000-05-25', '(47) 999678313', '00.701.142-1', '106.743.929-30', 2556.0, 5500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-04-09'); END IF;

    -- 16 | LUIZ HENRIQUE PEREIRA DOS SANTOS COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUIZ HENRIQUE PEREIRA DOS SANTOS COUTO', v_emp_15_id, 'ITAJAI', '2025-04-09', 'ENCARREGADO DE ARMAÇÃO', '1973-09-10', '(47) 997363799', '05.360.781-3', '086.958.879-60', 2994.0, 8500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-04-09'); END IF;

    -- 20 | LINDE JOHNSON DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LINDE JOHNSON DA SILVA', v_emp_15_id, 'ITAJAI', '2025-04-28', 'CARPINTEIRO', '1992-07-18', '(81) 992266075', '00.912.044-2', '115.397.454-14', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-04-28'); END IF;

    -- 22 | WANDERLEY FRANCISCO EUGENIO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('WANDERLEY FRANCISCO EUGENIO', v_emp_15_id, 'ITAJAI', '2025-04-28', 'CARPINTEIRO', '1971-08-07', '(81) 985458045', '00.460.044-6', '683.840.504-06', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-04-28'); END IF;

    -- 103 | ANDERSON CHAGAS DE LIMA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ANDERSON CHAGAS DE LIMA', v_emp_15_id, 'ITAJAI', '2025-05-21', 'CARPINTEIRO', '1998-03-12', '(47) 992415691', '63.226.503-6', '107.499.239-38', 1823.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-05-21'); END IF;

    -- 69 | FRANCISCO RAMOS DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('FRANCISCO RAMOS DE JESUS', v_emp_51_id, 'PORTO BELO', '2025-05-26', 'SERVENTE', '1972-11-20', '(47) 999465592', '00.241.942-7', '691.993.109-53', 2003.4, 2200.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-05-26'); END IF;

    -- 104 | MANOEL DE JESUS OLIVEIRA DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MANOEL DE JESUS OLIVEIRA DOS SANTOS', v_emp_15_id, 'ITAJAI', '2025-06-23', 'ARMADOR', '1978-04-21', '(92) 99382-3579', '00.410.781-7', '746.691.332-68', 2556.0, 4800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-06-23'); END IF;

    -- 77 | OTILENE DE SOUZA CARVALHO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('OTILENE DE SOUZA CARVALHO', v_emp_51_id, 'PORTO BELO', '2025-06-23', 'CARPINTEIRO', '1978-03-07', '(34) 99656-6691', '02.267.526-3', '658.207.032-00', 3393.52, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-06-23'); END IF;

    -- 72 | DALME MACIEL SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('DALME MACIEL SILVA', v_emp_51_id, 'PORTO BELO', '2025-06-23', 'CARPINTEIRO', '1979-11-22', '(34) 996533565', '02.274.374-9', '814.070.412-15', 3393.52, 5500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-06-23'); END IF;

    -- 772 | FABIO INVENCAO COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('FABIO INVENCAO COSTA', v_emp_31_id, 'ITAJAI', '2025-07-13', 'SERVENTE', '1985-04-06', '(75) 99263-7005', '135.303.699-5', '029.966.605-01', 1749.0, 2800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-07-13'); END IF;

    -- 25 | LUIS FILIPE DOS SANTOS COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUIS FILIPE DOS SANTOS COUTO', v_emp_15_id, 'ITAJAI', '2025-07-21', 'ARMADOR', '2007-07-01', '(47)99701-8871', '142.039.059-74', '142.039.059-74', 1933.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-07-21'); END IF;

    -- 28 | LUIZ HENRIQUE BEZERRA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUIZ HENRIQUE BEZERRA DA SILVA', v_emp_15_id, 'ITAJAI', '2025-07-22', 'CARPINTEIRO', '2002-02-21', '(81)99533-9029', '01.049.787-4', '714.618.234-71', 1933.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-07-22'); END IF;

    -- 29 | ALEX SANDRO CHAMBERLAIN
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ALEX SANDRO CHAMBERLAIN', v_emp_51_id, 'ITAJAI', '2025-07-23', 'CARPINTEIRO', '1996-10-04', '(41)99755-3669', '12.609.361-6', '090.206.989-66', 2556.0, 7500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-07-23'); END IF;

    -- 27 | WILIAN SANTOS PEREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('WILIAN SANTOS PEREIRA', v_emp_15_id, 'ITAJAI', '2025-07-24', 'ARMADOR', '1994-01-07', '(47)99261-3587', '210.803.410-2', '073.414.995-67', 1933.0, 3500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-07-24'); END IF;

    -- 39 | DIEGO GLAUCON CABRAL
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('DIEGO GLAUCON CABRAL', v_emp_15_id, 'ITAJAI', '2025-08-05', 'CARPINTEIRO', '1986-04-10', '(41)998276886', '09.058.808-7', '070.768.189-81', 2556.0, 6000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-08-05'); END IF;

    -- 38_varlei | VARLEI VAGNER MACHADO CABRAL
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('VARLEI VAGNER MACHADO CABRAL', v_emp_15_id, 'ITAJAI', '2025-08-05', 'CARPINTEIRO', '2001-01-01', '(41)987768648', '10.948.571-3', '074.239.159-04', 1823.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-08-05'); END IF;

    -- 773 | KLESIO FELIZ DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('KLESIO FELIZ DE SOUZA', v_emp_31_id, 'ITAJAI', '2025-08-06', 'ENCARREGADO DE OBRAS', '1986-11-23', '(47)99720-0374', '00.197.094-6', '059.166.494-10', 2994.0, 6500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-08-06'); END IF;

    -- 57 | RAIMUNDO DA SILVA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('RAIMUNDO DA SILVA RODRIGUES', v_emp_15_id, 'ITAJAI', '2025-08-08', 'ARMADOR', '1991-04-06', '(53)99920-8604', '02.451.146-3', '019.244.812-94', 2994.0, 5500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-08-08'); END IF;

    -- 86 | JAIRO BARBOSA DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JAIRO BARBOSA DE SOUZA', v_emp_15_id, 'ITAJAI', '2025-09-01', 'CARPINTEIRO', '1995-02-25', '41 8526-6836', '12.867.909-0', '089.471.629-81', 3174.0, 6500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-09-01'); END IF;

    -- 786 | ODOALIO JOSÉ DOS SANTOS TOLENTINO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ODOALIO JOSÉ DOS SANTOS TOLENTINO', v_emp_31_id, 'ITAJAI', '2025-09-09', 'PEDREIRO', '1992-12-16', '(47)98910-5507', '061.808.735-42', '061.808.735-42', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-09-09'); END IF;

    -- 89 | HENRIQUE VIEIRA DE SANTANA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('HENRIQUE VIEIRA DE SANTANA', v_emp_51_id, 'ITAJAI', '2025-09-16', 'SERVENTE', '2001-01-24', '(67) 9692-6749', '21353208-54', '123.149.225-22', 1749.0, 1749.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-09-16'); END IF;

    -- 88 | MARCOS JESSÉ DE DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MARCOS JESSÉ DE DE SOUZA', v_emp_51_id, 'ITAJAI', '2025-09-18', 'CARPINTEIRO', '1989-07-19', '-', '379.625.378-41', '379.625.378-41', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-09-18'); END IF;

    -- 64 | CARLOS EDUARDO PEREIRA DO CARMO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('CARLOS EDUARDO PEREIRA DO CARMO', v_emp_15_id, 'ITAJAI', '2025-10-13', 'CARPINTEIRO', '1996-04-21', '47 9600-3586', '-', '113.596.454-89', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-10-13'); END IF;

    -- 63 | MARCIO DA SILVA MELO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MARCIO DA SILVA MELO', v_emp_15_id, 'ITAJAI', '2025-10-13', 'ARMADOR', '1994-07-28', '-', '00.940.791-8', '101.399.294-60', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-10-13'); END IF;

    -- 90 | MILENE ROCHA DIAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MILENE ROCHA DIAS', v_emp_51_id, 'ITAJAI', '2025-10-17', 'SERVENTE', '1998-08-06', '41 8511-6896', '14.186.966-36', '038.087.802-07', 1854.0, 3000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-10-17'); END IF;

    -- 65_david | DAVID RICHALYSON PAULINO DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('DAVID RICHALYSON PAULINO DE OLIVEIRA', v_emp_15_id, 'ITAJAI', '2025-10-20', 'ARMADOR', '1994-01-26', '47 8417-0372', '00.815.737-8', '017.430.144-81', 2556.0, 5500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-10-20'); END IF;

    -- 93 | GELSON DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('GELSON DA SILVA', v_emp_51_id, 'ITAJAI', '2025-10-30', 'CARPINTEIRO', '1978-05-25', '47 9904-7194', '028712599-84', '028.712.599-84', 2556.0, 4000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-10-30'); END IF;

    -- 95 | ISAAC JOSE DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ISAAC JOSE DA SILVA', v_emp_51_id, 'ITAJAI', '2025-12-08', 'ARMADOR', '1968-12-12', '-', '6121.400.048-7', '612.140.004-87', 2556.0, 4000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2025-12-08'); END IF;

    -- 67 | EDILSON DE JESUS CHAGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('EDILSON DE JESUS CHAGAS', v_emp_15_id, 'ITAJAI', '2026-01-05', 'CARPINTEIRO', '1984-01-10', '(47) 999103846', '00.531.273-4', '055.834.229-98', 2556.0, 6500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-05'); END IF;

    -- 68 | EDILSON FERNANDES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('EDILSON FERNANDES', v_emp_15_id, 'ITAJAI', '2026-01-05', 'CARPINTEIRO', '1975-01-20', '(42)99867-8440', '7920995-3', '989.640.709-68', 1854.0, 2800.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-05'); END IF;

    -- 96 | LUCAS DO NASCIMENTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('LUCAS DO NASCIMENTO', v_emp_51_id, 'ITAJAI', '2026-01-06', 'CARPINTEIRO', '1992-12-29', '(15)99617-7999', '10.936.178-0', '093.475.789-59', 2556.0, 3500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-06'); END IF;

    -- 790 | CRISTIANO CONCEICAO COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('CRISTIANO CONCEICAO COSTA', v_emp_31_id, 'ITAJAI', '2026-01-07', 'SERVENTE', '2006-10-19', '(75)99165-3978', '101.197.275-10', '101.197.275-10', 1749.0, 2300.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-07'); END IF;

    -- 791 | CLEILTON OLIVEIRA FERREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('CLEILTON OLIVEIRA FERREIRA', v_emp_31_id, 'ITAJAI', '2026-01-12', 'PEDREIRO', '2001-02-23', '(47)99134-2852', '224.471.163-3', '095.482.165-31', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-12'); END IF;

    -- 100 | GUTEMBERGUE FILGUEIRA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('GUTEMBERGUE FILGUEIRA RODRIGUES', v_emp_51_id, 'ITAJAI', '2026-01-12', 'CARPINTEIRO', '1972-07-01', '(92)98599-9623', '638.816.752-72', '638.816.752-72', 2556.0, 4000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-12'); END IF;

    -- 97_adriano | MATHEUS ADRIANO DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('MATHEUS ADRIANO DA SILVA', v_emp_15_id, 'ITAJAI', '2026-01-12', 'CARPINTEIRO', '2000-08-06', '(41)99680-5697', '16202933-9', '167.622.834-97', 2556.0, 4500.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-12'); END IF;

    -- 97_jose | CRISTIAN JOSEPH LEAL SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('CRISTIAN JOSEPH LEAL SOUZA', v_emp_51_id, 'ITAJAI', '2026-01-13', 'CARPINTEIRO', '1991-10-15', '(96)98428-4388', '00.048.791-8', '008.539.642-70', 2556.0, 4000.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-13'); END IF;

    -- 792 | PAULO CESAR DO NASCIMENTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('PAULO CESAR DO NASCIMENTO', v_emp_31_id, 'ITAJAI', '2026-01-14', 'PEDREIRO', '1976-12-17', '(47)99658-8713', '00.375.475-6', '004.362.419-78', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-14'); END IF;

    -- 793 | ROBERTO DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('ROBERTO DE OLIVEIRA', v_emp_31_id, 'ITAJAI', '2026-01-14', 'PEDREIRO', '1986-05-16', '(47)99665-4377', '00.679.877-1', '033.513.911-61', 2556.0, 0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-14'); END IF;

    -- 101 | JOSÉ ADALTO CUNHA DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome_obra) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, salario_base, salario_combinado, status)
    VALUES ('JOSÉ ADALTO CUNHA DE SOUZA', v_emp_15_id, 'ITAJAI', '2026-01-27', 'SERVENTE', '1994-03-21', '91 8493-2243', '00.735.656-0', '018.919.982-26', 1749.0, 2300.0, 'ativo') RETURNING id INTO v_func_id;
    IF v_obra_id IS NOT NULL THEN INSERT INTO public.alocacoes (funcionario_id, obra_id, data_inicio) VALUES (v_func_id, v_obra_id, '2026-01-27'); END IF;

    -- VALIDAÇÕES FINAIS
    SELECT COUNT(*) INTO v_count_f FROM public.funcionarios;
    SELECT COUNT(*) INTO v_count_a FROM public.alocacoes;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'IMPORTAÇÃO PROJETO 03 CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE 'Total de funcionários: %', v_count_f;
    RAISE NOTICE 'Total de alocações:  %', v_count_a;
    RAISE NOTICE 'Duração: %', (now() - v_inicio);
    RAISE NOTICE '============================================================';

END $$;

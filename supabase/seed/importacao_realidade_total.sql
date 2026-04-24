-- ============================================================
-- SCRIPT: IMPORTAÇÃO REALIDADE TOTAL (TESTE ALVO) - V3 (MAPEADO)
-- CONSOLIDADO: EMPRESAS + OBRAS + FUNCIONÁRIOS (54 REGISTROS)
-- AMBIENTE: IRMÃOS UBERO (uvrqntfjknojxkiwsibz)
-- MODELO: Mapeamento profissional para colunas específicas
-- ============================================================

DO $$
DECLARE
    v_inicio        TIMESTAMPTZ := now();
    v_emp_31_id     UUID; -- 31.370.964/0001-55 (Marcos Paulo)
    v_emp_51_id     UUID; -- 51.647.127/0001-38 (Irmãos Ubero Engenharia)
    v_emp_15_id     UUID; -- 15.595.310/0001-73 (Irmãos Ubero LTDA)
    v_obra_id       UUID;
    v_count_f       INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'INÍCIO DA IMPORTAÇÃO DE REALIDADE (V3) - %', v_inicio;
    RAISE NOTICE '============================================================';

    -- ETAPA 1: LIMPEZA RADICAL (Respeitando todas as tabelas do projeto Irmãos Ubero)
    RAISE NOTICE '[LIMPEZA] Removendo dados anteriores e resetando estrutura...';
    TRUNCATE public.documentos_funcionario, public.assinaturas_digitais, public.diarios_obra, public.compras, public.itens_compra, public.movimentacoes_estoque, public.entregas_epi, public.folhas_pagamento, public.medicoes CASCADE;
    DELETE FROM public.funcionarios;
    DELETE FROM public.contas_receber;
    DELETE FROM public.obras;
    DELETE FROM public.empresas;

    -- ETAPA 2: EMPRESAS
    RAISE NOTICE '[EMPRESAS] Cadastrando empresas do grupo...';
    
    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj, ativo)
    VALUES ('MARCOS PAULO GOMEZ UBERO', 'MARCOS PAULO GOMEZ UBERO', '31.370.964/0001-55', true)
    RETURNING id INTO v_emp_31_id;

    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj, ativo)
    VALUES ('IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', 'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', '51.647.127/0001-38', true)
    RETURNING id INTO v_emp_51_id;

    INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj, ativo)
    VALUES ('IRMAOS UBERO ENGENHARIA LTDA', 'IRMAOS UBERO ENGENHARIA LTDA', '15.595.310/0001-73', true)
    RETURNING id INTO v_emp_15_id;

    -- ETAPA 3: OBRAS
    RAISE NOTICE '[OBRAS] Cadastrando 13 obras oficiais...';
    
    INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio) VALUES
    (v_emp_31_id, 'OBRA-001', 'ATMOS SKY', 'CEG', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'OBRA-002', 'MAISON LAFAYETTE', 'DALLO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'OBRA-003', 'JK 399', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'OBRA-004', 'OCEAN WIND', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'OBRA-005', 'JASPE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'OBRA-006', 'CELESTINA', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_51_id, 'OBRA-007', 'CITRINO PALACE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01'),
    (v_emp_31_id, 'OBRA-008', 'CASA ATALAIA 47', 'MACODESC', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'OBRA-009', 'SAINT LOUIS', 'DALLO', 'PORTO BELO', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_15_id, 'OBRA-010', 'TERRACE 360', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_15_id, 'OBRA-011', 'BRAVA OCEAN', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'OBRA-012', 'IOS RESIDENCIAL', 'PEGORIM ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01'),
    (v_emp_51_id, 'OBRA-013', 'SURYA', 'DIMENCIONAL ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01');

    -- ETAPA 4: FUNCIONÁRIOS
    RAISE NOTICE '[FUNCIONARIOS] Importando 54 colaboradores com mapeamento rico...';

    -- 65 | AFONSO CARLOS CORREA GARCIA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('65', 'AFONSO CARLOS CORREA GARCIA', v_emp_31_id, v_obra_id, 'ITAJAI', '2020-11-27', 'ENCARREGADO DE OBRAS', '1961-12-03', '(47) 99787-7106', '00.681.014-8', '215.686.343-15', '180.05510.58-1', 2994.0, 2994.0, 'ativo', 'SEGMED');

    -- 164 | WANDERSON JOSE NUNES DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('164', 'WANDERSON JOSE NUNES DE JESUS', v_emp_51_id, v_obra_id, 'PORTO BELO', '2021-07-24', 'CARPINTEIRO', '1997-05-23', '(47) 997910566', '04.022.917-3', '131.778.284-40', '207.59801.95-3', 3393.52, 6000.0, 'ativo', 'JMD', '(47) 997910566');

    -- 180 | MIGUEL MAMBERG VATRIN
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('180', 'MIGUEL MAMBERG VATRIN', v_emp_15_id, v_obra_id, 'ITAJAI', '2021-11-01', 'CARPINTEIRO', '1963-10-03', '(47) 992258361', '00.353.191-2', '920.341.109-78', '124.39672.81-7', 2556.0, 5000.0, 'ativo', 'SEGMED', '(47) 992258361');

    -- 213 | VALDECIR NEGELSKI
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('213', 'VALDECIR NEGELSKI', v_emp_31_id, v_obra_id, 'ITAJAI', '2022-01-13', 'CARPINTEIRO', '1972-05-10', '(46) 999336886', '7992.711.491-5', '799.271.149-15', '124.36372.59-6', 2556.0, 3000.0, 'ativo', 'SEGMED');

    -- 257 | MATHEUS ARAUJO MOHR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('257', 'MATHEUS ARAUJO MOHR', v_emp_31_id, v_obra_id, 'ITAJAI', '2022-03-01', 'OPERADOR DE GRUA', '2003-12-10', '(41) 998740180', '14.252.358-2', '117.108.199-52', '165.11289.96-7', 2556.0, 3300.0, 'ativo', 'JMD', '11710819952');

    -- 264 | MARCOS PEREIRA DE LIMA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('264', 'MARCOS PEREIRA DE LIMA', v_emp_15_id, v_obra_id, 'ITAJAI', '2022-03-09', 'SERVENTE', '1968-01-09', '(81) 989784095', '4628.908.940-4', '462.890.894-04', '122.96078.84-4', 1854.0, 2800.0, 'ativo', 'JMD');

    -- 426 | CELSO DE DEUS
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('426', 'CELSO DE DEUS', v_emp_31_id, 'ITAJAI', '2022-08-01', 'ENCARREGADO DE OBRAS', '1953-09-01', '(47) 988736803', '12R1611952', '183.352.769-00', '104.35827.82-2', 2994.0, 6000.0, 'ativo', 'SEGMED');

    -- 421 | JONEKSON JOÃO OLIVEIRA DA CUNHA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('421', 'JONEKSON JOÃO OLIVEIRA DA CUNHA', v_emp_31_id, v_obra_id, 'ITAJAI', '2022-08-01', 'CARPINTEIRO', '1971-03-26', '(47) 997437050', '00.234.702-3', '414.728.372-15', '268.41267.38-7', 2556.0, 4500.0, 'ativo', 'SEGMED');

    -- 516 | JUAREZ MOTTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('516', 'JUAREZ MOTTA', v_emp_15_id, v_obra_id, 'ITAJAI', '2023-02-02', 'ENCARREGADO DE OBRAS', '1988-03-12', '(41) 985242973', '10.172.173-6', '063.920.949-11', '200.19015.41-5', 3958.35, 8500.0, 'ativo', 'JMD');

    -- 531 | JOÃO VALDEVINO KLEIN DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('531', 'JOÃO VALDEVINO KLEIN DA SILVA', v_emp_31_id, v_obra_id, 'ITAJAI', '2023-02-14', 'ARMADOR', '1966-05-26', '(47) 997795810', '00.396.583-9', '723.829.379-04', '124.36063.74-7', 2556.0, 2411.0, 'ativo', 'JMD', '72382937904');

    -- 581 | LUCAS DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('581', 'LUCAS DE SOUZA', v_emp_15_id, v_obra_id, 'ITAJAI', '2023-06-20', 'CARPINTEIRO', '2001-03-13', '(47) 996762381', '00.770.539-2', '127.114.189-28', '151.03865.13-4', 2556.0, 3500.0, 'ativo', 'JMD', '12711418928');

    -- 622 | ELENO EMILIO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('622', 'ELENO EMILIO', v_emp_31_id, v_obra_id, 'ITAJAI', '2023-11-14', 'CARPINTEIRO', '1971-09-15', '(47) 997545502', '00.199.683-3', '645.276.119-68', '123.35094.25-6', 2556.0, 2411.0, 'ativo', 'SEGMED');

    -- 637 | JESSICA MADEIRO DA COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('637', 'JESSICA MADEIRO DA COSTA', v_emp_15_id, v_obra_id, 'ITAJAI', '2024-01-10', 'OPERADOR DE CREMALHEIRA', '1992-03-27', '(47) 997747738', '00.563.893-0', '080.824.089-79', '207.44706.08-9', 2556.0, 3000.0, 'ativo', 'JMD', 'jcostamdj@gmailcom');

    -- 641 | ALEXSON FERREIRA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('641', 'ALEXSON FERREIRA RODRIGUES', v_emp_31_id, v_obra_id, 'ITAJAI', '2024-01-15', 'CARPINTEIRO', '1978-08-07', '(92) 995278787', '6335.323.729-1', '633.532.372-91', '125.13030.34-8', 2556.0, 4500.0, 'ativo', 'JMD', '(92)984066619');

    -- 642 | JOÃO JORDAN BRASIL PINTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'ATMOS SKY' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('642', 'JOÃO JORDAN BRASIL PINTO', v_emp_31_id, v_obra_id, 'ITAJAI', '2024-01-15', 'ARMADOR', '1996-07-20', '(92) 993648110', '03.174.416-8', '702.549.772-00', '145.87323.74-4', 2556.0, 2556.0, 'ativo', 'SEGMED', 'mayarasenna73@gmailcom');

    -- 644 | LUIS FERNANDO VILAR PEREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('644', 'LUIS FERNANDO VILAR PEREIRA', v_emp_31_id, v_obra_id, 'ITAJAI', '2024-01-15', 'CARPINTEIRO', '1990-02-04', '(47) 984178123', '33956.342.007-6', '042.363.663-47', '201.78819.20-9', 1854.0, 3500.0, 'ativo', 'SEGMED');

    -- 670 | NELSON SOUSA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'BRAVA OCEAN' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('670', 'NELSON SOUSA DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2024-03-20', 'PEDREIRO', '1993-04-04', '(91) 98507-7786', '00.057.464-7', '024.513.182-52', '165.62750.39-4', 2556.0, 4300.0, 'ativo', 'SEGMED', '(91)985077786');

    -- 686 | RONALDO SANTOS DE SANTANA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('686', 'RONALDO SANTOS DE SANTANA', v_emp_51_id, v_obra_id, 'PORTO BELO', '2024-05-14', 'CARPINTEIRO', '1995-10-20', '(47) 989058781', 'MG19057483', '073.285.805-42', '165.86696.44-6', 3393.52, 4900.0, 'ativo', 'JMD', '7328580542');

    -- 699 | LEONARDO FERREIRA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('699', 'LEONARDO FERREIRA DA SILVA', v_emp_51_id, v_obra_id, 'ITAJAI', '2024-06-12', 'CARPINTEIRO', '1996-06-20', '(16) 993325939', '45.851.307-6', '235.886.068-90', '210.21555.61-6', 1854.0, 2800.0, 'ativo', 'JMD', '23588606890');

    -- 710 | LUCAS VARGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'MAISON LAFAYETTE' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('710', 'LUCAS VARGAS', v_emp_31_id, v_obra_id, 'ITAPEMA', '2024-07-24', 'SERVENTE', '1999-07-16', '(47) 997273270', '1223.609.197-4', '122.360.919-74', '164.75514.47-1', 2003.4, 2003.4, 'ativo', 'SEGMED');

    -- 711 | MARCO ANTONIO WUST
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('711', 'MARCO ANTONIO WUST', v_emp_51_id, v_obra_id, 'PORTO BELO', '2024-08-01', 'CARPINTEIRO', '1976-05-01', '(47) 992227781', '106.661.510-3', '912.149.040-68', '127.44036.71-6', 3393.52, 4850.0, 'ativo', 'JMD', '00.091.214/9040-68');

    -- 38 | JOSIAS MOTTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('38', 'JOSIAS MOTTA', v_emp_51_id, v_obra_id, 'ITAJAI', '2024-08-27', 'ENCARREGADO DE OBRAS', '1982-07-05', '(47) 984023301', '08.862.228-6', '041.236.179-56', '200.12866.83-5', 2994.0, 7500.0, 'ativo', 'JMD', 'josiasmotta32@hotmailcom');

    -- 722 | RODRIGO VILELA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('722', 'RODRIGO VILELA DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2024-09-04', 'CARPINTEIRO', '1989-07-09', '(47) 991999279', '00.804.328-7', '016.721.830-14', '129.73700.70-3', 2556.0, 0, 'ativo', 'JMD', '016.721.830-14');

    -- 102 | ADENILSON SOARES CHAGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('102', 'ADENILSON SOARES CHAGAS', v_emp_15_id, v_obra_id, 'ITAJAI', '2024-10-07', 'CARPINTEIRO', '1982-04-24', '(47) 996867904', '00.838.667-1', '055.835.679-61', '126.07561.52-5', 3393.52, 6500.0, 'ativo', 'JMD', '055.835.679-61');

    -- 46 | JOANILSON DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('46', 'JOANILSON DE OLIVEIRA', v_emp_51_id, v_obra_id, 'PORTO BELO', '2024-10-10', 'CARPINTEIRO', '1971-01-16', '(49) 999497527', '673.549.690-6', '067.354.969-06', '124.12069.96-6', 3393.52, 4500.0, 'ativo', 'JMD', '067.354.969-06');

    -- 4 | VALDEMIRO MOHR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('4', 'VALDEMIRO MOHR', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-01-07', 'ENCARREGADO DE OBRAS', '1981-12-14', '(41) 988842163', '04.690.026-8', '053.220.169-88', '129.37548.51-4', 2994.0, 0, 'ativo', 'JMD', '053.220.169-88');

    -- 6 | JEAN JUDE MEUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('6', 'JEAN JUDE MEUS', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-01-13', 'ARMADOR', '1990-09-23', '(47) 999580661', 'V876480S', '062.119.867-69', '158.56525.27-6', 1823.0, 3000.0, 'ativo', 'JMD', '062.119.867-69');

    -- 7 | ROBERTO PEREIRA DA CONCEIÇÃO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('7', 'ROBERTO PEREIRA DA CONCEIÇÃO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-01-13', 'SERVENTE', '1982-05-13', '(11) 983427957', '00.513.007-7', '443.436.738-20', '138.61887.85-0', 1749.0, 2800.0, 'ativo', 'JMD', '(11)983427957');

    -- 730 | GILBERTO LIMA DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('730', 'GILBERTO LIMA DE JESUS', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-01-21', 'PEDREIRO', '1990-03-11', '(75)991882115', '157.331.024-7', '052.689.815-10', '162.31277.67-5', 2556.0, 0, 'ativo', 'JMD', '(47)999240650');

    -- 53 | WASHINGTON DE SANTANA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('53', 'WASHINGTON DE SANTANA SILVA', v_emp_51_id, v_obra_id, 'PORTO BELO', '2025-01-21', 'CARPINTEIRO', '1986-09-01', '(08) 199164801', '747.640.440-8', '074.764.044-05', '135.42125.45-7', 3393.52, 4700.0, 'ativo', 'JMD', '074.764.044-05');

    -- 52 | JOSÉ ROGERIO DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('52', 'JOSÉ ROGERIO DOS SANTOS', v_emp_51_id, v_obra_id, 'PORTO BELO', '2025-01-21', 'CARPINTEIRO', '1988-10-15', '(47) 997106671', '00.776.862-0', '079.294.159-45', '161.78809.72-8', 3393.52, 5000.0, 'ativo', 'JMD', '(47)997106671');

    -- 732 | EVERTON SANTOS DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('732', 'EVERTON SANTOS DA SILVA', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-01-22', 'PEDREIRO', '1979-10-21', '(47)992629257', '21.819.157-0', '002.181.915-70', '129.79784.54-2', 2556.0, 0, 'ativo', 'JMD', '002.181.915-70');

    -- 748 | MILTON HUMBERTO DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('748', 'MILTON HUMBERTO DOS SANTOS', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-02-26', 'PEDREIRO', '1960-10-23', '(47) 999920571', '00.672.296-2', '656.957.124-91', '170.01632.55-2', 2556.0, 0, 'ativo', 'JMD', '656.957.124-91');

    -- 14 | LINDEMBERG ARAUJO DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('14', 'LINDEMBERG ARAUJO DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-03-03', 'CARPINTEIRO', '1996-09-04', '(84) 999745504', '00.334.507-3', '700.913.574-62', '164.79027.45-1', 2556.0, 0, 'ativo', 'JMD', '700.913.574-62');

    -- 13 | JOHN JEFFERSON MESY
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('13', 'JOHN JEFFERSON MESY', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-03-03', 'SERVENTE', '1995-09-26', '(47) 996327375', 'RNM F396340A', '801.740.749-13', '268.91580.30-5', 1749.0, 3000.0, 'ativo', 'JMD', '801.740.749-13');

    -- 749 | YASEL OSCAR LOPES LIENS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('749', 'YASEL OSCAR LOPES LIENS', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-03-10', 'PEDREIRO', '1990-12-03', '(47) 992297957', 'RNMB241789L', '026.821.849-87', '273.12910.64-0', 2556.0, 4500.0, 'ativo', 'JMD');

    -- 750 | LUIZ CARLOS DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('750', 'LUIZ CARLOS DOS SANTOS', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-03-13', 'PEDREIRO', '1970-07-06', '(47) 999338876', '00.559.200-5', '712.486.684-72', '124.29567.97-2', 2556.0, 4000.0, 'ativo', 'JMD', '(91)980365568');

    -- 17 | ADEMIR RIBEIRO COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('17', 'ADEMIR RIBEIRO COUTO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-04-09', 'ARMADOR', '1972-03-30', '(47) 999646712', '00.226.531-6', '043.599.269-44', '122.99517.51-2', 2556.0, 5500.0, 'ativo', 'JMD', '043.599.269-44');

    -- 18 | ADEMIR RIBEIRO COUTO JUNIOR
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('18', 'ADEMIR RIBEIRO COUTO JUNIOR', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-04-09', 'ARMADOR', '2000-05-25', '(47) 999678313', '00.701.142-1', '106.743.929-30', '212.91663.45-4', 2556.0, 5500.0, 'ativo', 'JMD', 'emillysoares18042006@gmailcom');

    -- 16 | LUIZ HENRIQUE PEREIRA DOS SANTOS COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('16', 'LUIZ HENRIQUE PEREIRA DOS SANTOS COUTO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-04-09', 'ENCARREGADO DE ARMAÇÃO', '1973-09-10', '(47) 997363799', '05.360.781-3', '086.958.879-60', '207.64260.81-7', 2994.0, 8500.0, 'ativo', 'JMD', '086.958.879-60');

    -- 20 | LINDE JOHNSON DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('20', 'LINDE JOHNSON DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-04-28', 'CARPINTEIRO', '1992-07-18', '(81) 992266075', '00.912.044-2', '115.397.454-14', '163.63439.83-4', 2556.0, 0, 'ativo', 'JMD', '115.397.454-14');

    -- 22 | WANDERLEY FRANCISCO EUGENIO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('22', 'WANDERLEY FRANCISCO EUGENIO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-04-28', 'CARPINTEIRO', '1971-08-07', '(81) 985458045', '00.460.044-6', '683.840.504-06', '123.43760.34-0', 2556.0, 0, 'ativo', 'JMD', '683.840.504-06');

    -- 103 | ANDERSON CHAGAS DE LIMA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('103', 'ANDERSON CHAGAS DE LIMA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-05-21', 'CARPINTEIRO', '1998-03-12', '(47) 992415691', '63.226.503-6', '107.499.239-38', '273.04383.55-6', 1823.0, 3000.0, 'ativo', 'JMD', '(47)992415691');

    -- 69 | FRANCISCO RAMOS DE JESUS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('69', 'FRANCISCO RAMOS DE JESUS', v_emp_51_id, v_obra_id, 'PORTO BELO', '2025-05-26', 'SERVENTE', '1972-11-20', '(47) 999465592', '00.241.942-7', '691.993.109-53', '123.30364.29-8', 2003.4, 2200.0, 'ativo', 'JMD', '(47)999465592');

    -- 104 | MANOEL DE JESUS OLIVEIRA DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('104', 'MANOEL DE JESUS OLIVEIRA DOS SANTOS', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-06-23', 'ARMADOR', '1978-04-21', '(92) 99382-3579', '00.410.781-7', '746.691.332-68', '128.95088.42-1', 2556.0, 4800.0, 'ativo', 'JMD', '746.691.332-68');

    -- 77 | OTILENE DE SOUZA CARVALHO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('77', 'OTILENE DE SOUZA CARVALHO', v_emp_51_id, v_obra_id, 'PORTO BELO', '2025-06-23', 'CARPINTEIRO', '1978-03-07', '(34) 99656-6691', '02.267.526-3', '658.207.032-00', '200.07293.24-5', 3393.52, 4500.0, 'ativo', 'JMD');

    -- 72 | DALME MACIEL SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SAINT LOUIS' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('72', 'DALME MACIEL SILVA', v_emp_51_id, v_obra_id, 'PORTO BELO', '2025-06-23', 'CARPINTEIRO', '1979-11-22', '(34) 996533565', '02.274.374-9', '814.070.412-15', '160.88602.50-4', 3393.52, 5500.0, 'ativo', 'JMD');

    -- 772 | FABIO INVENCAO COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('772', 'FABIO INVENCAO COSTA', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-07-13', 'SERVENTE', '1985-04-06', '(75) 99263-7005', '135.303.699-5', '029.966.605-01', '128.16226.08-7', 1749.0, 2800.0, 'ativo', 'JMD');

    -- 25 | LUIS FILIPE DOS SANTOS COUTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('25', 'LUIS FILIPE DOS SANTOS COUTO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-07-21', 'ARMADOR', '2007-07-01', '(47)99701-8871', '142.039.059-74', '142.039.059-74', '214.13558.46-3', 1933.0, 3000.0, 'ativo', 'JMD');

    -- 28 | LUIZ HENRIQUE BEZERRA DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('28', 'LUIZ HENRIQUE BEZERRA DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-07-22', 'CARPINTEIRO', '2002-02-21', '(81)99533-9029', '01.049.787-4', '714.618.234-71', '201.99018.91-4', 1933.0, 0, 'ativo', 'JMD');

    -- 29 | ALEX SANDRO CHAMBERLAIN
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('29', 'ALEX SANDRO CHAMBERLAIN', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-07-23', 'CARPINTEIRO', '1996-10-04', '(41)99755-3669', '12.609.361-6', '090.206.989-66', '161.57202.79-4', 2556.0, 7500.0, 'ativo', 'JMD', '090.206.989-66');

    -- 27 | WILIAN SANTOS PEREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('27', 'WILIAN SANTOS PEREIRA', v_emp_15_id, v_obra_id, 'ITAJAI', '1994-01-07', 'ARMADOR', '1994-01-07', '(47)99261-3587', '210.803.410-2', '073.414.995-67', '165.57384.91-1', 1933.0, 3500.0, 'ativo', 'JMD');

    -- 39 | DIEGO GLAUCON CABRAL
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('39', 'DIEGO GLAUCON CABRAL', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-08-05', 'CARPINTEIRO', '1986-04-10', '(41)998276886', '09.058.808-7', '070.768.189-81', '161.58646.64-5', 2556.0, 6000.0, 'ativo', 'JMD', '070.768.189-81');

    -- 38_varlei | VARLEI VAGNER MACHADO CABRAL
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('38_varlei', 'VARLEI VAGNER MACHADO CABRAL', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-08-05', 'CARPINTEIRO', '2001-01-01', '(41)987768648', '10.948.571-3', '074.239.159-04', '135.33097.44-6', 1823.0, 0, 'ativo', 'JMD', '074.239.159-04');

    -- 773 | KLESIO FELIZ DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('773', 'KLESIO FELIZ DE SOUZA', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-08-06', 'ENCARREGADO DE OBRAS', '1986-11-23', '(47)99720-0374', '00.197.094-6', '059.166.494-10', '130.04432.64.0', 2994.0, 6500.0, 'ativo', 'JMD');

    -- 57 | RAIMUNDO DA SILVA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('57', 'RAIMUNDO DA SILVA RODRIGUES', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-08-08', 'ARMADOR', '1991-04-06', '(53)99920-8604', '02.451.146-3', '019.244.812-94', '165.58306.52-3', 2994.0, 5500.0, 'ativo', 'JMD');

    -- 86 | JAIRO BARBOSA DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('86', 'JAIRO BARBOSA DE SOUZA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-09-01', 'CARPINTEIRO', '1995-02-25', '41 8526-6836', '12.867.909-0', '089.471.629-81', '200.12165.19-5', 3174.0, 6500.0, 'ativo', 'JMD-BALNEARIO');

    -- 786 | ODOALIO JOSÉ DOS SANTOS TOLENTINO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('786', 'ODOALIO JOSÉ DOS SANTOS TOLENTINO', v_emp_31_id, v_obra_id, 'ITAJAI', '2025-09-09', 'PEDREIRO', '1992-12-16', '(47)98910-5507', '061.808.735-42', '061.808.735-42', '206.46391.41-5', 2556.0, 0, 'ativo', 'JMD-BALNEARIO', '061.808.735-42');

    -- 89 | HENRIQUE VIEIRA DE SANTANA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('89', 'HENRIQUE VIEIRA DE SANTANA', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-09-16', 'SERVENTE', '2001-01-24', '(67) 9692-6749', '21353208-54', '123.149.225-22', '161.37409.94-6', 1749.0, 1749.0, 'ativo', 'JMD-BALNEARIO');

    -- 88 | MARCOS JESSÉ DE DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('88', 'MARCOS JESSÉ DE DE SOUZA', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-09-18', 'CARPINTEIRO', '1989-07-19', '-', '379.625.378-41', '379.625.378-41', '164.35891.46.0', 2556.0, 4500.0, 'ativo', 'JMD-ITAPEMA');

    -- 64 | CARLOS EDUARDO PEREIRA DO CARMO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('64', 'CARLOS EDUARDO PEREIRA DO CARMO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-10-13', 'CARPINTEIRO', '1996-04-21', '47 9600-3586', '-', '113.596.454-89', '020.93294.92-8', 2556.0, 0, 'ativo', 'JMD-BALNEARIO', '47 99760-7347');

    -- 63 | MARCIO DA SILVA MELO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('63', 'MARCIO DA SILVA MELO', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-10-13', 'ARMADOR', '1994-07-28', '-', '00.940.791-8', '101.399.294-60', '163.82360.49.0', 2556.0, 4500.0, 'ativo', 'JMD-BALNEARIO');

    -- 90 | MILENE ROCHA DIAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('90', 'MILENE ROCHA DIAS', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-10-17', 'SERVENTE', '1998-08-06', '41 8511-6896', '14.186.966-36', '038.087.802-07', '164.69493.66-2', 1854.0, 3000.0, 'ativo', 'JMD-BALNEARIO', '038.087.802-07');

    -- 65_david | DAVID RICHALYSON PAULINO DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('65_david', 'DAVID RICHALYSON PAULINO DE OLIVEIRA', v_emp_15_id, v_obra_id, 'ITAJAI', '2025-10-20', 'ARMADOR', '1994-01-26', '47 8417-0372', '00.815.737-8', '017.430.144-81', '160.04749.44-4', 2556.0, 5500.0, 'ativo', 'JMD-BALNEARIO');

    -- 93 | GELSON DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('93', 'GELSON DA SILVA', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-10-30', 'CARPINTEIRO', '1978-05-25', '47 9904-7194', '028712599-84', '028.712.599-84', '125134101-8', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO', '028.712.599-84');

    -- 95 | ISAAC JOSE DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('95', 'ISAAC JOSE DA SILVA', v_emp_51_id, v_obra_id, 'ITAJAI', '2025-12-08', 'ARMADOR', '1968-12-12', '-', '6121.400.048-7', '612.140.004-87', '122.96078.06.2', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO', '612.140.004-87');

    -- 67 | EDILSON DE JESUS CHAGAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('67', 'EDILSON DE JESUS CHAGAS', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-01-05', 'CARPINTEIRO', '1984-01-10', '(47) 999103846', '00.531.273-4', '055.834.229-98', '128.65697.49-7', 2556.0, 6500.0, 'ativo', 'JMD-BALNEARIO');

    -- 68 | EDILSON FERNANDES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('68', 'EDILSON FERNANDES', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-01-05', 'CARPINTEIRO', '1975-01-20', '(42)99867-8440', '7920995-3', '989.640.709-68', '125.95450.51-6', 1854.0, 2800.0, 'ativo', 'JMD-BALNEARIO');

    -- 96 | LUCAS DO NASCIMENTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('96', 'LUCAS DO NASCIMENTO', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-01-06', 'CARPINTEIRO', '1992-12-29', '(15)99617-7999', '10.936.178-0', '093.475.789-59', '163.61384.19-6', 2556.0, 3500.0, 'ativo', 'JMD-BALNEARIO');

    -- 790 | CRISTIANO CONCEICAO COSTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('790', 'CRISTIANO CONCEICAO COSTA', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-01-07', 'SERVENTE', '2006-10-19', '(75)99165-3978', '101.197.275-10', '101.197.275-10', '016.51015.59-2', 1749.0, 2300.0, 'ativo', 'JMD-BALNEARIO', '75991653978');

    -- 791 | CLEILTON OLIVEIRA FERREIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('791', 'CLEILTON OLIVEIRA FERREIRA', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-01-12', 'PEDREIRO', '2001-02-23', '(47)99134-2852', '224.471.163-3', '095.482.165-31', '142.69128.29-8', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 100 | GUTEMBERGUE FILGUEIRA RODRIGUES
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('100', 'GUTEMBERGUE FILGUEIRA RODRIGUES', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-01-12', 'CARPINTEIRO', '1972-07-01', '(92)98599-9623', '638.816.752-72', '638.816.752-72', '126.75380.02-6', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO');

    -- 97_adriano | MATHEUS ADRIANO DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('97_adriano', 'MATHEUS ADRIANO DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-01-12', 'CARPINTEIRO', '2000-08-06', '(41)99680-5697', '16202933-9', '167.622.834-97', '164.96086.80-0', 2556.0, 4500.0, 'ativo', 'JMD-BALNEARIO', '(41)984127205');

    -- 97_jose | CRISTIAN JOSEPH LEAL SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('97_jose', 'CRISTIAN JOSEPH LEAL SOUZA', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-01-13', 'CARPINTEIRO', '1991-10-15', '(96)98428-4388', '00.048.791-8', '008.539.642-70', '210.33363.01-6', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO');

    -- 792 | PAULO CESAR DO NASCIMENTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('792', 'PAULO CESAR DO NASCIMENTO', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-01-14', 'PEDREIRO', '1976-12-17', '(47)99658-8713', '00.375.475-6', '004.362.419-78', '125.44406.16-1', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 793 | ROBERTO DE OLIVEIRA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('793', 'ROBERTO DE OLIVEIRA', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-01-14', 'PEDREIRO', '1986-05-16', '(47)99665-4377', '00.679.877-1', '033.513.911-61', '210.47580.98-7', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 101 | JOSÉ ADALTO CUNHA DE SOUZA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('101', 'JOSÉ ADALTO CUNHA DE SOUZA', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-01-27', 'SERVENTE', '1994-03-21', '91 8493-2243', '00.735.656-0', '018.919.982-26', '190.63889.01-3', 1749.0, 2300.0, 'ativo', 'JMD-BALNEARIO', '018.919.982-26');

    -- 106_adrielle | ADRIELLE LORENA DOS SANTOS DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('106_adrielle', 'ADRIELLE LORENA DOS SANTOS DA SILVA', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-02-02', 'SERVENTE', '2006-10-04', '92 8437-0706', '4085036-6', '102.436.392-95', '271.92299.01-0', 1854.0, 2300.0, 'ativo', 'JMD-BALNEARIO', '102.436.392-95');

    -- 106_genesio | GENESIO MOTTA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('106_genesio', 'GENESIO MOTTA', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-02', 'CARPINTEIRO', '1972-01-23', '67 9668-9803', '07.519.872-8', '639.446.181-49', '125.03653.76-8', 2556.0, 6000.0, 'ativo', 'JMD-BALNEARIO');

    -- 108 | ANDERSON LUIZ LIRA RIBEIRO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('108', 'ANDERSON LUIZ LIRA RIBEIRO', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-03', 'SERVENTE', '1983-06-16', '91 8121-2334', '00.400.271-1', '010.301.882-46', '131.59113.55-7', 1749.0, 2200.0, 'ativo', 'JMD-BALNEARIO');

    -- 107 | THIAGO NAZARE DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('107', 'THIAGO NAZARE DOS SANTOS', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-02-05', 'CARPINTEIRO', '1988-04-05', '47 9666-9654', '9422.290.127-2', '942.449.012-72', '132.65497.42-8', 2556.0, 6000.0, 'ativo', 'JMD-BALNEARIO');

    -- 109_advaldo | ADVALDO MAIA DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('109_advaldo', 'ADVALDO MAIA DOS SANTOS', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-10', 'CARPINTEIRO', '1980-10-07', '47 9251-0105', '00.330.603-1', '824.952.202-82', '202.20441.10-8', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO');

    -- 81_guilherme | GUILHERME GONÇAILVES DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('81_guilherme', 'GUILHERME GONÇALVES DOS SANTOS', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-10', 'CARPINTEIRO', '2001-09-29', '84 96990324', '3664971', '711.861.374-60', '162.88922.59-6', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 109_luiz | LUIZ CARLOS DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'TERRACE 360' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('109_luiz', 'LUIZ CARLOS DOS SANTOS', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-02-18', 'CARPINTEIRO', '1991-06-22', '(19) 99654-2979', '00.893.563-1', '106.444.084-30', '164.93197.62-8', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 112 | MICHEL JONATHAN DOS SANTOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('112', 'MICHEL JONATHAN DOS SANTOS', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-18', 'CARPINTEIRO', '1986-12-16', '47 997007886', '00.769.388-4', '054.062.169-29', '164.30888.79-7', 2556.0, 4500.0, 'ativo', 'JMD-BALNEARIO');

    -- 111 | MÁRCIO ROBERTO DA SILVA MATOS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('111', 'MÁRCIO ROBERTO DA SILVA MATOS', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-18', 'SERVENTE', '1988-10-08', '(47) 99646-4869', '9759.992.790-0', '975.999.279-00', '163.59368.76-6', 1749.0, 1749.0, 'ativo', 'JMD-BALNEARIO');

    -- 780 | LUIZ ANDRÉ SALDANHA GARCIA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('780', 'LUIZ ANDRÉ SALDANHA GARCIA', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-02-23', 'PEDREIRO', '1980-12-07', '47 92029760', '207.733.334-8', '025.055.870-00', '204.47032.64-4', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 114 | DERMANO DIEUJUSTE
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('114', 'DERMANO DIEUJUSTE', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-02-24', 'SERVENTE', '1989-02-04', '47 996749219', '602.154.650-40', '602.154.650-40', '153.46381.76-0', 1749.0, 2300.0, 'ativo', 'JMD-BALNEARIO');

    -- 116 | CLAUDEMIR ROCHA DIAS
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('116', 'CLAUDEMIR ROCHA DIAS', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-03-02', 'CARPINTEIRO', '1993-08-15', '41 96087574', '00.123.997-4', '030.458.662-38', '164.68797.75-7', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO');

    -- 795 | JOSIVAN GONCALVES DA SILVA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('795', 'JOSIVAN GONCALVES DA SILVA', v_emp_31_id, v_obra_id, 'ITAJAI', '2026-03-02', 'PEDREIRO', '1981-01-21', '84 88554037', '00.809.828-4', '046.930.294-16', '127.73741.64-3', 2556.0, 0, 'ativo', 'JMD-BALNEARIO');

    -- 796 | MARCOS PAULO SILVA DO NASCIMENTO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'CASA ATALAIA 47' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('796', 'MARCOS PAULO SILVA DO NASCIMENTO', v_emp_31_id, v_obra_id, 'ITAJAI', '2020-07-16', 'SERVENTE', '2000-07-16', '84 8697-9249', '00.440.873-1', '707.302.514-03', '164.68476.82-9', 1749.0, 2200.0, 'ativo', 'JMD-BALNEARIO');

    -- 181 | LUCAS DO NASCIMENTO BARBOSA
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('181', 'LUCAS DO NASCIMENTO BARBOSA', v_emp_15_id, v_obra_id, 'ITAJAI', '2026-03-11', 'CARPINTEIRO', '2004-02-17', '-', '01.351.905-0', '055.474.862-21', '164.65625.85.8', 2556.0, 3500.0, 'ativo', 'JMD-BALNEARIO');

    -- 117 | VALDEREZ FERNANDO PEREIRA DINIZ
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('117', 'VALDEREZ FERNANDO PEREIRA DINIZ', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-03-18', 'CARPINTEIRO', '1988-12-02', '47 997886262', '06.549.991-1', '047.824.423-19', '165.39346.34-5', 2556.0, 6000.0, 'ativo', 'JMD-BALNEARIO');

    -- 118 | WELLINGTON PEREIRA ASCENDINO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'SURYA' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso)
    VALUES ('118', 'WELLINGTON PEREIRA ASCENDINO', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-03-30', 'CARPINTEIRO', '1994-12-10', '47 935051055', '00.957.910-6', '115.584.504-83', '020.63152.73-3', 2556.0, 4000.0, 'ativo', 'JMD-BALNEARIO');

    -- 119 | JANDUIR ANTONIO ALBINO
    SELECT id INTO v_obra_id FROM public.obras WHERE UPPER(nome) = 'IOS RESIDENCIAL' LIMIT 1;
    INSERT INTO public.funcionarios (numero_registro, nome, empresa_id, obra_id, cidade, data_admissao, cargo, data_nascimento, telefone, rg, cpf, pis, salario_base, salario_combinado, status, clinica_aso, codigo_pix)
    VALUES ('119', 'JANDUIR ANTONIO ALBINO', v_emp_51_id, v_obra_id, 'ITAJAI', '2026-04-09', 'ARMADOR', '1979-12-29', '(47) 99604-0042', '00.713.051-9', '043.600.974-92', '124.82806.85.4', 2411.0, 6000.0, 'ativo', 'JMD-BALNEARIO', '(47) 99604-0042');

    -- VALIDAÇÕES FINAIS
    SELECT COUNT(*) INTO v_count_f FROM public.funcionarios;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'IMPORTAÇÃO (V3) CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE 'Total de funcionários: %', v_count_f;
    RAISE NOTICE 'Duração: %', (now() - v_inicio);
    RAISE NOTICE '============================================================';

END $$;

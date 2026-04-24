# ============================================================
# SCRIPT POWERSHELL: Executa reset + seed via Supabase REST API
# Projeto: znfxvpggckayokiphglt
# ============================================================
# Como executar:
#   1. Abra PowerShell como Administrador (ou normal)
#   2. Navegue até a pasta do projeto:
#      cd "c:\Users\luisu\APLICATIVO\irm-os-ubero"
#   3. Execute:
#      .\supabase\seed\executar_reset_seed.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ---- Configurações do projeto ----
$SUPABASE_URL      = "https://znfxvpggckayokiphglt.supabase.co"
# ⚠️  IMPORTANTE: Substitua pela sua SERVICE_ROLE_KEY (não a anon key)
# Você encontra em: Supabase Dashboard → Settings → API → service_role key
$SERVICE_ROLE_KEY  = "COLE_SUA_SERVICE_ROLE_KEY_AQUI"

if ($SERVICE_ROLE_KEY -eq "COLE_SUA_SERVICE_ROLE_KEY_AQUI") {
    Write-Host ""
    Write-Host "❌ ERRO: Você precisa inserir a SERVICE_ROLE_KEY neste script!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Como encontrar sua SERVICE_ROLE_KEY:" -ForegroundColor Yellow
    Write-Host "  1. Acesse: https://supabase.com/dashboard/project/znfxvpggckayokiphglt/settings/api" -ForegroundColor Yellow
    Write-Host "  2. Copie a chave 'service_role' (NÃO a anon/public)" -ForegroundColor Yellow
    Write-Host "  3. Cole no campo SERVICE_ROLE_KEY neste arquivo" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$SQL = @"
DO \$\$
DECLARE
  v_inicio        TIMESTAMPTZ := now();
  v_empresa_1_id  UUID;
  v_empresa_2_id  UUID;
  v_empresa_3_id  UUID;
  v_total_emp     INTEGER := 0;
  v_total_obras   INTEGER := 0;
BEGIN
  -- BACKUP
  SELECT COUNT(*) INTO v_total_emp   FROM public.empresas;
  SELECT COUNT(*) INTO v_total_obras FROM public.obras;
  RAISE NOTICE '[BACKUP] Empresas antes: %, Obras antes: %', v_total_emp, v_total_obras;

  -- LIMPEZA
  DELETE FROM public.assinaturas_digitais WHERE funcionario_id IN (SELECT id FROM public.funcionarios);
  DELETE FROM public.medicao_boletim_itens WHERE medicao_id IN (SELECT id FROM public.medicoes);
  DELETE FROM public.medicao_retencoes_impostos WHERE medicao_id IN (SELECT id FROM public.medicoes);
  DELETE FROM public.medicoes;
  DELETE FROM public.medicao_contrato_itens;
  DELETE FROM public.medicao_reajustes;
  DELETE FROM public.orcamento_itens WHERE orcamento_id IN (SELECT id FROM public.orcamentos);
  DELETE FROM public.orcamentos;
  DELETE FROM public.servicos_extras;
  DELETE FROM public.diarios_obra;
  DELETE FROM public.movimentacoes_estoque WHERE obra_id IS NOT NULL;
  DELETE FROM public.itens_compra WHERE compra_id IN (SELECT id FROM public.compras);
  DELETE FROM public.compras;
  DELETE FROM public.contas_pagar;
  DELETE FROM public.contas_receber;
  DELETE FROM public.equipamentos_proprios;
  DELETE FROM public.solicitacoes_compra_equipamento;
  DELETE FROM public.equipamentos_locados;
  DELETE FROM public.documentos_funcionario;
  DELETE FROM public.folhas_pagamento;
  DELETE FROM public.funcionarios;
  DELETE FROM public.obras;
  DELETE FROM public.empresas;
  RAISE NOTICE '[LIMPEZA] Concluida!';

  -- EMPRESAS
  INSERT INTO public.empresas (id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at)
  VALUES (gen_random_uuid(), 'MARCOS PAULO GOMEZ UBERO', 'MARCOS PAULO GOMEZ UBERO', '31.370.964/0001-55', true, now(), now())
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social, updated_at = now()
  RETURNING id INTO v_empresa_1_id;
  RAISE NOTICE '[EMPRESA 1] ID = %', v_empresa_1_id;

  INSERT INTO public.empresas (id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at)
  VALUES (gen_random_uuid(), 'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', 'IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA', '51.647.127/0001-38', true, now(), now())
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social, updated_at = now()
  RETURNING id INTO v_empresa_2_id;
  RAISE NOTICE '[EMPRESA 2] ID = %', v_empresa_2_id;

  INSERT INTO public.empresas (id, razao_social, nome_fantasia, cnpj, ativo, created_at, updated_at)
  VALUES (gen_random_uuid(), 'IRMAOS UBERO ENGENHARIA LTDA', 'IRMAOS UBERO ENGENHARIA LTDA', '15.595.310/0001-73', true, now(), now())
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social, updated_at = now()
  RETURNING id INTO v_empresa_3_id;
  RAISE NOTICE '[EMPRESA 3] ID = %', v_empresa_3_id;

  -- OBRAS
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_1_id, 'OBRA-001', 'ATMOS SKY', 'CEG', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_1_id, 'OBRA-002', 'MAISON LAFAYETTE', 'DALLO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_1_id, 'OBRA-003', 'JK 399', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_1_id, 'OBRA-004', 'OCEAN WIND', 'RAYMUNDI', 'ITAJAI', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-005', 'JASPE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-006', 'CELESTINA', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-007', 'CITRINO PALACE RESIDENCE', 'BRANCO', 'ITAPEMA', 'SC', 'concluida', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_1_id, 'OBRA-008', 'CASA ATALAIA 47', 'MACODESC', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-009', 'SAINT LOUIS', 'DALLO', 'PORTO BELO', 'SC', 'em_andamento', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_3_id, 'OBRA-010', 'TERRACE 36', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_3_id, 'OBRA-011', 'BRAVA OCEAN', 'CN', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-012', 'IOS RESIDENCIAL', 'PEGORIM ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now());
  INSERT INTO public.obras (empresa_id, codigo, nome, construtora, cidade, uf, status, data_inicio, created_at, updated_at) VALUES (v_empresa_2_id, 'OBRA-013', 'SURYA', 'DIMENCIONAL ENGENHARIA', 'ITAJAI', 'SC', 'em_andamento', '2025-01-01', now(), now());
  RAISE NOTICE '[OBRAS] 13 obras inseridas!';

  -- VALIDAÇÃO
  SELECT COUNT(*) INTO v_total_emp   FROM public.empresas;
  SELECT COUNT(*) INTO v_total_obras FROM public.obras;

  IF v_total_emp = 3 AND v_total_obras = 13 THEN
    RAISE NOTICE 'Status: SUCESSO - % empresas, % obras criadas', v_total_emp, v_total_obras;
  ELSE
    RAISE EXCEPTION 'Status: ERRO - esperado 3 empresas e 13 obras | obtido % empresas e % obras', v_total_emp, v_total_obras;
  END IF;

END \$\$;
"@

Write-Host ""
Write-Host "🚀 Iniciando execução do script de reset + seed..." -ForegroundColor Cyan
Write-Host "   Projeto: znfxvpggckayokiphglt" -ForegroundColor Gray
Write-Host "   Hora:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "apikey"        = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
}

$body = @{ query = $SQL } | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Script executado com sucesso!" -ForegroundColor Green
    Write-Host $response
} catch {
    # Tenta endpoint alternativo pg_meta
    Write-Host "⚠️  Tentando endpoint alternativo..." -ForegroundColor Yellow
    try {
        $response2 = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/pg/query" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop
        Write-Host "✅ Sucesso via endpoint alternativo!" -ForegroundColor Green
        Write-Host $response2
    } catch {
        Write-Host ""
        Write-Host "❌ Não foi possível executar via API REST." -ForegroundColor Red
        Write-Host ""
        Write-Host "👉 Por favor, execute o script manualmente no Supabase Dashboard:" -ForegroundColor Yellow
        Write-Host "   https://supabase.com/dashboard/project/znfxvpggckayokiphglt/sql/new" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   O arquivo SQL está em:" -ForegroundColor Yellow
        Write-Host "   c:\Users\luisu\APLICATIVO\irm-os-ubero\supabase\seed\reset_e_seed_empresas_obras.sql" -ForegroundColor Cyan
        Write-Host ""
    }
}

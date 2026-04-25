# Script de Migração de Equipamentos Próprios entre Projetos Supabase

$srcBaseUrl = "https://znfxvpggckayokiphglt.supabase.co/rest/v1"
$srcKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnh2cGdnY2theW9raXBoZ2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjE1MDUsImV4cCI6MjA4ODI5NzUwNX0.tyn_LVl_lgF-tfF-rdApkk-Cc9RmGsPkTRXjXHs51vY"

$dstBaseUrl = "https://uvrqntfjknojxkiwsibz.supabase.co/rest/v1"
$dstKey = "sb_publishable_9iKbH80_q1JDoXx0nEdJEA_Vjjve55s"

# MAPAS DE IDS (Baseado no nome/cnpj para garantir match)
$empMap = @{
    "7bb90b77-50b8-4692-a36f-69f613741fb6" = "722fde7e-ad00-44bb-ac81-883a10dacb87" # MARCOS PAULO
    "44af37e9-06e1-4d88-93e4-44772d2adb41" = "2d409daf-6fd1-4123-b5ee-7069efd3c4df" # IRMAOS UBERO ENGENHARIA
    "dd5ebcd7-6ace-4b8a-9004-fa8f95c9c160" = "1b26fff8-3de9-4d5e-b630-bfd51e875585" # IRMAOS UBERO LTDA
}

$obraMap = @{
    "781735c8-4a82-4549-bb20-4e27d72374cf" = "bfe20b2e-bb5a-4442-ae3d-66803e9c884a" # ATMOS SKY
    "dccb5f73-2bcd-415a-a9b4-a60614fc6756" = "b50a5b38-3bad-403d-8f75-bba73eb2e894" # TERRACE 360
    # Adicionar outros se necessário, mas a maioria está null no source
}

$srcHeaders = @{ "apikey" = $srcKey; "Authorization" = "Bearer $srcKey" }
$dstHeaders = @{ "apikey" = $dstKey; "Authorization" = "Bearer $dstKey"; "Content-Type" = "application/json"; "Prefer" = "return=representation" }

Write-Host "Iniciando extração do projeto Lovable..."
$equipamentos = Invoke-RestMethod -Uri "$srcBaseUrl/equipamentos_proprios?select=*" -Headers $srcHeaders -Method Get

Write-Host "Encontrados $($equipamentos.Count) equipamentos. Iniciando migração..."

foreach ($e in $equipamentos) {
    # Mapear IDs
    $newEmpId = $empMap[$e.empresa_id]
    $newObraId = if ($null -ne $e.obra_id) { $obraMap[$e.obra_id] } else { $null }

    # Criar objeto para inserção (removendo IDs originais e timestamps de criação para evitar conflitos)
    $payload = @{
        codigo          = $e.codigo
        descricao       = $e.descricao
        tipo            = $e.tipo
        marca           = $e.marca
        modelo          = $e.modelo
        numero_serie    = $e.numero_serie
        data_aquisicao  = $e.data_aquisicao
        valor_aquisicao = $e.valor_aquisicao
        status          = $e.status
        observacoes     = $e.observacoes
        foto_url        = $e.foto_url
        empresa_id      = $newEmpId
        obra_id         = $newObraId
    }

    $jsonPayload = $payload | ConvertTo-Json
    
    try {
        Write-Host "Migrando: $($e.codigo) - $($e.descricao)..."
        $res = Invoke-RestMethod -Uri "$dstBaseUrl/equipamentos_proprios" -Headers $dstHeaders -Method Post -Body $jsonPayload
        Write-Host "OK!" -ForegroundColor Green
    } catch {
        Write-Host "ERRO ao migrar $($e.codigo): $_" -ForegroundColor Red
    }
}

Write-Host "Migração concluída!"

# Configuração para evitar erro no Powershell se houver parada
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Corrigindo Vínculo - IRMÃOS UBERO " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
cd "C:\Users\luisu\APLICATIVO\irm-os-ubero"

Write-Host "Fazendo login caso necessário..."
bunx supabase login

Write-Host "Vinculando projeto uvrqntfjknojxkiwsibz..."
bunx supabase link --project-ref uvrqntfjknojxkiwsibz

Write-Host "Resetando e subindo o banco (IRMÃOS UBERO) - ATENÇÃO ISSO APAGA OS DADOS REMOTOS E RECRIARÁ..."
bunx supabase db reset --linked


Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Corrigindo Vínculo - PROJETO 03 " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
cd "C:\Users\luisu\aplicativo 03\projeto-03"

Write-Host "Vinculando projeto dtxqpjvmvsdkhatyapbb..."
bunx supabase link --project-ref dtxqpjvmvsdkhatyapbb

Write-Host "Resetando e subindo o banco (PROJETO 03) - ATENÇÃO ISSO APAGA OS DADOS REMOTOS E RECRIARÁ..."
bunx supabase db reset --linked

Write-Host ""
Write-Host "Procedimento finalizado!" -ForegroundColor Green

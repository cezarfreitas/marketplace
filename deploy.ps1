# Script de Deploy para Windows
# Uso: .\deploy.ps1

Write-Host "🚀 Iniciando deploy do IA Generator SEO..." -ForegroundColor Blue

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json não encontrado. Execute este script no diretório raiz do projeto." -ForegroundColor Red
    exit 1
}

try {
    # 1. Parar processos existentes
    Write-Host "⏹️ Parando processos existentes..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2

    # 2. Pull das últimas alterações
    Write-Host "📥 Baixando últimas alterações do repositório..." -ForegroundColor Blue
    git pull origin master

    # 3. Limpar dependências antigas
    Write-Host "🧹 Limpando dependências antigas..." -ForegroundColor Yellow
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
    if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

    # 4. Instalar dependências
    Write-Host "📦 Instalando dependências..." -ForegroundColor Blue
    npm install

    # 5. Verificar variáveis de ambiente
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
        exit 1
    }

    # 6. Build da aplicação
    Write-Host "🔨 Fazendo build da aplicação..." -ForegroundColor Blue
    npm run build

    # 7. Verificar se o build foi bem-sucedido
    if (-not (Test-Path ".next")) {
        Write-Host "❌ Build falhou! Diretório .next não foi criado." -ForegroundColor Red
        exit 1
    }

    # 8. Iniciar aplicação
    Write-Host "▶️ Iniciando aplicação..." -ForegroundColor Green
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden

    # 9. Aguardar e verificar
    Start-Sleep -Seconds 5
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "🌐 Aplicação disponível em: http://localhost:3000" -ForegroundColor Green

} catch {
    Write-Host "❌ Erro durante o deploy: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

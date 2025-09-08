# Script de Deploy para VTEX Product Importer (PowerShell)
# Este script automatiza o processo de deploy da aplicação no Windows

param(
    [switch]$Clean,
    [switch]$Production
)

# Configuração de cores
$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Log "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-Log "❌ $Message" "Red"
    exit 1
}

function Write-Warning {
    param([string]$Message)
    Write-Log "⚠️  $Message" "Yellow"
}

Write-Log "🚀 Iniciando deploy do VTEX Product Importer..." "Blue"

# Verificar se Docker está instalado
try {
    docker --version | Out-Null
    Write-Success "Docker encontrado"
} catch {
    Write-Error "Docker não está instalado. Por favor, instale o Docker Desktop primeiro."
}

# Verificar se Docker Compose está instalado
try {
    docker-compose --version | Out-Null
    Write-Success "Docker Compose encontrado"
} catch {
    Write-Error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Warning "Arquivo .env não encontrado. Criando a partir do template..."
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Warning "Arquivo .env criado. Por favor, configure as variáveis de ambiente antes de continuar."
        exit 1
    } else {
        Write-Error "Arquivo env.example não encontrado."
    }
}

Write-Success "Arquivo .env encontrado"

# Parar containers existentes
Write-Log "Parando containers existentes..."
try {
    docker-compose down --remove-orphans
    Write-Success "Containers parados"
} catch {
    Write-Warning "Erro ao parar containers (podem não existir)"
}

# Remover imagens antigas se solicitado
if ($Clean) {
    Write-Log "Removendo imagens antigas..."
    try {
        docker-compose down --rmi all --volumes --remove-orphans
        Write-Success "Imagens antigas removidas"
    } catch {
        Write-Warning "Erro ao remover imagens antigas"
    }
}

# Build da aplicação
Write-Log "Fazendo build da aplicação..."
try {
    docker-compose build --no-cache
    Write-Success "Build concluído"
} catch {
    Write-Error "Erro no build da aplicação"
}

# Configurar banco de dados
Write-Log "Configurando banco de dados..."
if (Test-Path "scripts/setup-database.js") {
    try {
        node scripts/setup-database.js
        Write-Success "Banco de dados configurado com sucesso"
    } catch {
        Write-Warning "Erro ao configurar banco de dados. Execute manualmente: node scripts/setup-database.js"
    }
} else {
    Write-Warning "Script de configuração do banco não encontrado"
}

# Iniciar aplicação
if ($Production) {
    Write-Log "Iniciando em modo produção com Nginx..."
    try {
        docker-compose --profile production up -d
        Write-Success "Aplicação iniciada em modo produção"
    } catch {
        Write-Error "Erro ao iniciar aplicação em modo produção"
    }
} else {
    Write-Log "Iniciando aplicação..."
    try {
        docker-compose up -d app
        Write-Success "Aplicação iniciada"
    } catch {
        Write-Error "Erro ao iniciar aplicação"
    }
}

# Aguardar aplicação ficar pronta
Write-Log "Aguardando aplicação ficar pronta..."
Start-Sleep -Seconds 10

# Verificar se a aplicação está rodando
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Success "Aplicação está rodando em http://localhost:3000"
    } else {
        Write-Error "Aplicação não está respondendo corretamente"
    }
} catch {
    Write-Error "Aplicação não está respondendo. Verifique os logs: docker-compose logs app"
}

# Mostrar status dos containers
Write-Log "Status dos containers:"
docker-compose ps

# Mostrar logs recentes
Write-Log "Logs recentes da aplicação:"
docker-compose logs --tail=20 app

Write-Success "Deploy concluído com sucesso!"

Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor "Cyan"
Write-Host "1. Acesse http://localhost:3000" -ForegroundColor "White"
Write-Host "2. Faça login com: admin / admin123" -ForegroundColor "White"
Write-Host "3. Configure as credenciais VTEX nas configurações" -ForegroundColor "White"
Write-Host "4. Inicie a importação de dados" -ForegroundColor "White"
Write-Host ""
Write-Host "🔧 Comandos úteis:" -ForegroundColor "Cyan"
Write-Host "- Ver logs: docker-compose logs -f app" -ForegroundColor "White"
Write-Host "- Parar aplicação: docker-compose down" -ForegroundColor "White"
Write-Host "- Reiniciar: docker-compose restart app" -ForegroundColor "White"
Write-Host "- Deploy limpo: .\scripts\deploy.ps1 -Clean" -ForegroundColor "White"
Write-Host "- Deploy produção: .\scripts\deploy.ps1 -Production" -ForegroundColor "White"

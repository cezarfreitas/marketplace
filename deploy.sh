#!/bin/bash

# Script de Deploy Automático para VPS
# Uso: ./deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do IA Generator SEO..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "package.json não encontrado. Execute este script no diretório raiz do projeto."
    exit 1
fi

# 1. Parar processos existentes
log "⏹️ Parando processos existentes..."
pkill -f "next" || true
pkill -f "node.*3000" || true
sleep 2

# 2. Verificar se a porta 3000 está livre
if lsof -i :3000 >/dev/null 2>&1; then
    warning "Porta 3000 ainda está em uso. Tentando liberar..."
    fuser -k 3000/tcp || true
    sleep 2
fi

# 3. Pull das últimas alterações
log "📥 Baixando últimas alterações do repositório..."
git pull origin master

# 4. Verificar se há mudanças
if git diff --quiet HEAD~1 HEAD; then
    warning "Nenhuma alteração detectada desde o último commit."
else
    log "✅ Novas alterações detectadas."
fi

# 5. Limpar dependências antigas
log "🧹 Limpando dependências antigas..."
rm -rf node_modules
rm -f package-lock.json
rm -rf .next

# 6. Instalar dependências
log "📦 Instalando dependências..."
npm install

# 7. Verificar variáveis de ambiente
if [ ! -f ".env" ]; then
    error "Arquivo .env não encontrado!"
    exit 1
fi

# 8. Build da aplicação
log "🔨 Fazendo build da aplicação..."
npm run build

# 9. Verificar se o build foi bem-sucedido
if [ ! -d ".next" ]; then
    error "Build falhou! Diretório .next não foi criado."
    exit 1
fi

# 10. Iniciar aplicação
log "▶️ Iniciando aplicação..."

# Tentar usar PM2 se disponível
if command -v pm2 &> /dev/null; then
    log "Usando PM2 para gerenciar o processo..."
    
    # Parar instâncias existentes
    pm2 stop marketplace || true
    pm2 delete marketplace || true
    
    # Iniciar nova instância
    pm2 start npm --name "marketplace" -- start
    pm2 save
    
    # Verificar status
    sleep 3
    if pm2 list | grep -q "marketplace.*online"; then
        success "Aplicação iniciada com sucesso via PM2!"
    else
        error "Falha ao iniciar aplicação via PM2"
        pm2 logs marketplace --lines 20
        exit 1
    fi
else
    log "PM2 não encontrado. Iniciando em background..."
    nohup npm start > app.log 2>&1 &
    sleep 5
    
    # Verificar se está rodando
    if pgrep -f "next" > /dev/null; then
        success "Aplicação iniciada em background!"
    else
        error "Falha ao iniciar aplicação"
        cat app.log
        exit 1
    fi
fi

# 11. Verificar se a aplicação está respondendo
log "🔍 Verificando se a aplicação está respondendo..."
sleep 5

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    success "✅ Deploy concluído com sucesso!"
    success "🌐 Aplicação disponível em: http://localhost:3000"
else
    warning "⚠️ Aplicação pode não estar respondendo corretamente"
    log "Verificando logs..."
    
    if command -v pm2 &> /dev/null; then
        pm2 logs marketplace --lines 10
    else
        tail -20 app.log
    fi
fi

# 12. Informações finais
log "📊 Status do sistema:"
echo "  - Uso de memória: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "  - Uso de disco: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
echo "  - Processos Node.js: $(pgrep -f node | wc -l)"

success "🎉 Deploy finalizado!"

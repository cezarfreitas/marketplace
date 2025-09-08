#!/bin/bash

# Script de Deploy para VPS com EasyPanel
# Uso: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="meli-app"
DOCKER_IMAGE="meli-app:latest"

echo "🚀 Iniciando deploy para ambiente: $ENVIRONMENT"
echo "📦 Projeto: $PROJECT_NAME"

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker e tente novamente."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down || true

# Remover imagens antigas (opcional)
if [ "$2" = "--clean" ]; then
    echo "🧹 Removendo imagens antigas..."
    docker rmi $DOCKER_IMAGE || true
fi

# Build da aplicação
echo "🔨 Fazendo build da aplicação..."
docker-compose build --no-cache

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
docker-compose up -d

# Aguardar aplicação inicializar
echo "⏳ Aguardando aplicação inicializar..."
sleep 10

# Verificar se aplicação está rodando
echo "🔍 Verificando status da aplicação..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Aplicação iniciada com sucesso!"
    
    # Testar health check
    echo "🏥 Testando health check..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Health check passou!"
    else
        echo "⚠️  Health check falhou, mas aplicação está rodando"
    fi
    
    # Mostrar logs
    echo "📋 Últimos logs:"
    docker-compose logs --tail=20
    
    echo ""
    echo "🎉 Deploy concluído com sucesso!"
    echo "🌐 Aplicação disponível em: http://localhost:3000"
    echo "📊 Para ver logs: docker-compose logs -f"
    echo "🛑 Para parar: docker-compose down"
    
else
    echo "❌ Falha ao iniciar aplicação"
    echo "📋 Logs de erro:"
    docker-compose logs
    exit 1
fi
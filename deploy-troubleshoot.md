# 🔧 Guia de Solução de Problemas de Deploy no VPS

## Problemas Comuns e Soluções

### 1. **Deploy Travado - Processo em Execução**
```bash
# Verificar processos Node.js rodando
ps aux | grep node
ps aux | grep npm
ps aux | grep next

# Matar processos específicos
kill -9 [PID]
pkill -f node
pkill -f npm
```

### 2. **Porta 3000 Ocupada**
```bash
# Verificar o que está usando a porta 3000
netstat -tulpn | grep :3000
lsof -i :3000

# Matar processo na porta 3000
fuser -k 3000/tcp
```

### 3. **Problemas de Memória**
```bash
# Verificar uso de memória
free -h
top
htop

# Limpar cache se necessário
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

### 4. **Problemas de Build**
```bash
# Limpar build anterior
rm -rf .next
rm -rf dist
rm -rf build

# Reinstalar dependências
rm -rf node_modules
npm install

# Build limpo
npm run build
```

### 5. **Problemas de Permissão**
```bash
# Corrigir permissões
sudo chown -R $USER:$USER /path/to/project
chmod -R 755 /path/to/project
```

### 6. **Reiniciar Serviços**
```bash
# Se usando PM2
pm2 restart all
pm2 stop all
pm2 start ecosystem.config.js

# Se usando systemd
sudo systemctl restart your-app.service
sudo systemctl status your-app.service

# Se usando Docker
docker-compose down
docker-compose up -d
```

### 7. **Verificar Logs**
```bash
# Logs do PM2
pm2 logs

# Logs do systemd
sudo journalctl -u your-app.service -f

# Logs do Docker
docker-compose logs -f
```

### 8. **Deploy Manual Limpo**
```bash
# 1. Parar todos os processos
pkill -f node
pkill -f npm

# 2. Ir para o diretório do projeto
cd /path/to/your/project

# 3. Pull das últimas alterações
git pull origin master

# 4. Limpar e reinstalar
rm -rf node_modules
rm package-lock.json
npm install

# 5. Build limpo
npm run build

# 6. Iniciar aplicação
npm start
# ou
pm2 start ecosystem.config.js
```

### 9. **Verificar Variáveis de Ambiente**
```bash
# Verificar se .env existe
ls -la .env

# Verificar conteúdo (sem mostrar senhas)
cat .env | grep -v PASSWORD
```

### 10. **Comandos de Emergência**
```bash
# Reiniciar servidor (último recurso)
sudo reboot

# Verificar espaço em disco
df -h

# Verificar logs do sistema
sudo tail -f /var/log/syslog
```

## Script de Deploy Automático

Crie um arquivo `deploy.sh`:

```bash
#!/bin/bash
echo "🚀 Iniciando deploy..."

# Parar processos
echo "⏹️ Parando processos..."
pkill -f node || true
pkill -f npm || true

# Pull código
echo "📥 Baixando código..."
git pull origin master

# Limpar e reinstalar
echo "🧹 Limpando dependências..."
rm -rf node_modules
rm -f package-lock.json
npm install

# Build
echo "🔨 Fazendo build..."
npm run build

# Iniciar
echo "▶️ Iniciando aplicação..."
pm2 start ecosystem.config.js --env production

echo "✅ Deploy concluído!"
```

## Contatos de Suporte

- **Logs importantes**: `/var/log/`
- **Configurações PM2**: `~/.pm2/`
- **Configurações Nginx**: `/etc/nginx/`

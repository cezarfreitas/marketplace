# Deploy para VPS com EasyPanel

Este documento descreve como fazer o deploy da aplicação IA Generator SEO em um VPS usando EasyPanel.

## 📋 Pré-requisitos

- VPS com Docker instalado
- EasyPanel configurado no VPS
- Acesso SSH ao VPS
- Domínio configurado (opcional)

## 🚀 Processo de Deploy

### 1. Preparação do Código

O projeto já está configurado com:
- ✅ `Dockerfile` otimizado para produção
- ✅ `.dockerignore` para build eficiente
- ✅ `docker-compose.yml` para EasyPanel
- ✅ Configurações de ambiente de produção

### 2. Configuração no EasyPanel

#### Opção A: Deploy via Git (Recomendado)

1. **Conectar repositório Git:**
   - No EasyPanel, vá para "Projects"
   - Clique em "New Project"
   - Selecione "Git Repository"
   - Cole a URL do seu repositório Git
   - Configure as credenciais se necessário

2. **Configurar variáveis de ambiente:**
   ```
   DB_HOST=server.idenegociosdigitais.com.br
   DB_PORT=3349
   DB_USER=meli
   DB_PASSWORD=7dd3e59ddb3c3a5da0e3
   DB_NAME=meli
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   PORT=3000
   ```

3. **Configurar domínio (opcional):**
   - Adicione seu domínio nas configurações
   - Configure SSL automático

#### Opção B: Deploy via Docker Compose

1. **Upload dos arquivos:**
   - Faça upload dos arquivos para o VPS
   - Ou clone o repositório diretamente no VPS

2. **Executar deploy:**
   ```bash
   # No VPS via SSH
   cd /path/to/your/project
   docker-compose up -d
   ```

### 3. Verificação do Deploy

1. **Verificar se o container está rodando:**
   ```bash
   docker ps
   ```

2. **Verificar logs:**
   ```bash
   docker-compose logs -f app
   ```

3. **Testar a aplicação:**
   - Acesse `http://seu-vps-ip:3000`
   - Ou `https://seu-dominio.com` (se configurado)

### 4. Configuração de Domínio (Opcional)

Se você tem um domínio, configure:

1. **DNS:**
   - Aponte seu domínio para o IP do VPS
   - Configure subdomínio se necessário

2. **SSL:**
   - EasyPanel pode configurar SSL automático
   - Ou use Let's Encrypt manualmente

## 🔧 Configurações Avançadas

### Variáveis de Ambiente Importantes

```bash
# Banco de Dados (já configurado)
DB_HOST=server.idenegociosdigitais.com.br
DB_PORT=3349
DB_USER=meli
DB_PASSWORD=7dd3e59ddb3c3a5da0e3
DB_NAME=meli

# Segurança (ALTERE EM PRODUÇÃO!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024

# Performance
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Configurações VTEX (Opcional)

Se você usar integração VTEX:

```bash
VTEX_ACCOUNT_NAME=seu-account
VTEX_ENVIRONMENT=vtexcommercestable
VTEX_APP_KEY=sua-app-key
VTEX_APP_TOKEN=seu-app-token
VTEX_BASE_URL=https://seu-account.vtexcommercestable.com.br
```

### Configurações OpenAI (Opcional)

Se você usar IA para geração de conteúdo:

```bash
OPENAI_API_KEY=sua-openai-api-key
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Container não inicia:**
   ```bash
   docker-compose logs app
   ```

2. **Erro de conexão com banco:**
   - Verifique as credenciais do banco
   - Teste a conectividade do VPS com o banco

3. **Erro de build:**
   ```bash
   docker-compose build --no-cache
   ```

4. **Problemas de memória:**
   - Aumente os recursos do VPS
   - Otimize as configurações do Docker

### Comandos Úteis

```bash
# Reiniciar aplicação
docker-compose restart

# Ver logs em tempo real
docker-compose logs -f

# Acessar container
docker-compose exec app sh

# Parar aplicação
docker-compose down

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento

### Health Check

A aplicação inclui um endpoint de health check:
- `GET /api/health`

### Logs

Os logs são exibidos via:
```bash
docker-compose logs -f app
```

## 🔒 Segurança

### Recomendações

1. **Altere o JWT_SECRET** em produção
2. **Use HTTPS** com SSL
3. **Configure firewall** no VPS
4. **Mantenha o sistema atualizado**
5. **Faça backups regulares**

### Firewall (UFW)

```bash
# Permitir SSH
sudo ufw allow ssh

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Permitir porta da aplicação (se não usar proxy)
sudo ufw allow 3000

# Ativar firewall
sudo ufw enable
```

## 📈 Performance

### Otimizações

1. **Recursos do VPS:**
   - Mínimo: 1GB RAM, 1 CPU
   - Recomendado: 2GB RAM, 2 CPU

2. **Configurações Docker:**
   - O Dockerfile já está otimizado
   - Usa multi-stage build
   - Imagem Alpine para menor tamanho

3. **Cache:**
   - Next.js já otimiza automaticamente
   - Imagens são otimizadas

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Teste a conectividade: `curl http://localhost:3000/api/health`
3. Verifique recursos: `docker stats`
4. Reinicie se necessário: `docker-compose restart`

---

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin123`

**⚠️ IMPORTANTE:** Altere essas credenciais em produção!
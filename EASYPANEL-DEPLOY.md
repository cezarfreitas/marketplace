# 🚀 Deploy no EasyPanel - Guia Completo

## ✅ Status do Projeto

O projeto **IA Generator SEO** está completamente configurado e pronto para deploy:

- ✅ **Código enviado para GitHub**: [https://github.com/cezarfreitas/marketplace.git](https://github.com/cezarfreitas/marketplace.git)
- ✅ **Dockerfile otimizado** para produção
- ✅ **Docker Compose** configurado
- ✅ **Sistema de autenticação** com banco de dados
- ✅ **Banco de dados** configurado e funcionando
- ✅ **Documentação completa** de deploy

## 🎯 Deploy no EasyPanel

### Passo 1: Acessar EasyPanel

1. Acesse seu painel EasyPanel
2. Faça login na sua conta
3. Vá para a seção "Projects"

### Passo 2: Criar Novo Projeto

1. **Clique em "New Project"**
2. **Selecione "Git Repository"**
3. **Configure o repositório:**
   - **Repository URL**: `https://github.com/cezarfreitas/marketplace.git`
   - **Branch**: `master`
   - **Build Context**: `/` (raiz do projeto)

### Passo 3: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente no EasyPanel:

```bash
# Configurações do Banco de Dados
DB_HOST=server.idenegociosdigitais.com.br
DB_PORT=3349
DB_USER=meli
DB_PASSWORD=7dd3e59ddb3c3a5da0e3
DB_NAME=meli

# JWT Secret (IMPORTANTE: Altere em produção!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Configurações da Aplicação
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000

# Configurações VTEX (opcional)
VTEX_ACCOUNT_NAME=
VTEX_ENVIRONMENT=vtexcommercestable
VTEX_APP_KEY=
VTEX_APP_TOKEN=
VTEX_BASE_URL=

# Configurações OpenAI (opcional)
OPENAI_API_KEY=

# Configurações de Log
LOG_LEVEL=info
```

### Passo 4: Configurar Domínio (Opcional)

1. **Adicione seu domínio** nas configurações do projeto
2. **Configure SSL automático** (Let's Encrypt)
3. **Exemplo**: `meli.idenegociosdigitais.com.br`

### Passo 5: Deploy

1. **Clique em "Deploy"**
2. **Aguarde o build** (pode levar alguns minutos)
3. **Verifique os logs** para acompanhar o progresso

## 🔧 Configurações Avançadas

### Docker Compose (Alternativa)

Se preferir usar Docker Compose diretamente:

1. **Use o arquivo `docker-compose.yml`** incluído no projeto
2. **Configure as variáveis** no arquivo ou via ambiente
3. **Execute**: `docker-compose up -d`

### Health Check

A aplicação inclui um endpoint de health check:
- **URL**: `GET /api/health`
- **Resposta**: Status da aplicação e banco de dados

## 🎉 Pós-Deploy

### Verificações

1. **Acesse a aplicação**:
   - URL: `http://seu-vps-ip:3000` ou `https://seu-dominio.com`

2. **Teste o login**:
   - **Usuário**: `admin`
   - **Senha**: `admin123`

3. **Verifique funcionalidades**:
   - ✅ Dashboard com estatísticas
   - ✅ Sistema de produtos
   - ✅ Análise de imagens
   - ✅ Sincronização Anymarket

### Logs e Monitoramento

```bash
# Ver logs em tempo real
docker-compose logs -f

# Verificar status dos containers
docker ps

# Verificar uso de recursos
docker stats
```

## 🔒 Segurança

### ⚠️ IMPORTANTE - Alterar em Produção:

1. **JWT_SECRET**: Altere para uma chave segura e única
2. **Credenciais de login**: Altere usuário e senha padrão
3. **Configurações de banco**: Verifique se as credenciais estão corretas

### Recomendações:

- ✅ Use HTTPS com SSL
- ✅ Configure firewall no VPS
- ✅ Mantenha o sistema atualizado
- ✅ Faça backups regulares
- ✅ Monitore logs de acesso

## 🆘 Troubleshooting

### Problemas Comuns:

1. **Container não inicia**:
   ```bash
   docker-compose logs app
   ```

2. **Erro de conexão com banco**:
   - Verifique as credenciais do banco
   - Teste conectividade: `telnet server.idenegociosdigitais.com.br 3349`

3. **Erro de build**:
   ```bash
   docker-compose build --no-cache
   ```

4. **Problemas de memória**:
   - Aumente recursos do VPS
   - Otimize configurações Docker

### Comandos Úteis:

```bash
# Reiniciar aplicação
docker-compose restart

# Parar aplicação
docker-compose down

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Acessar container
docker-compose exec app sh
```

## 📊 Recursos do Sistema

### Funcionalidades Implementadas:

- ✅ **Dashboard** com estatísticas em tempo real
- ✅ **Sistema de autenticação** com JWT
- ✅ **Gestão de produtos** com análise de imagens
- ✅ **Integração VTEX** para importação
- ✅ **Sincronização Anymarket** para marketplace
- ✅ **Geração de descrições** com IA
- ✅ **Sistema de logs** e monitoramento
- ✅ **Interface responsiva** e moderna

### Tecnologias:

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Banco de Dados**: MySQL (remoto)
- **Autenticação**: JWT com bcrypt
- **Containerização**: Docker, Docker Compose
- **Deploy**: EasyPanel, VPS

## 🎯 Próximos Passos

1. **Deploy no EasyPanel** usando este guia
2. **Configurar domínio** e SSL
3. **Alterar credenciais** de segurança
4. **Testar todas as funcionalidades**
5. **Configurar monitoramento** e backups

---

**🎉 Parabéns!** Seu sistema IA Generator SEO está pronto para produção!

**📞 Suporte**: Em caso de dúvidas, consulte os logs ou a documentação completa em `DEPLOY.md`

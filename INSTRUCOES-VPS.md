# 🚀 Instruções para Atualizar o VPS

## ⚠️ IMPORTANTE: Adicionar Variável de Ambiente

Para resolver o erro `ECONNREFUSED ::1:3000` no VPS, você **DEVE** adicionar a seguinte variável de ambiente ao arquivo `.env`:

```env
NEXT_PUBLIC_APP_URL=https://b2b-seo.jzo3qo.easypanel.host
```

## 📋 Passos para Atualizar

### 1. Conectar ao VPS

```bash
ssh seu-usuario@seu-vps
```

### 2. Navegar até o diretório do projeto

```bash
cd /caminho/do/seu/projeto
```

### 3. Fazer pull das alterações

```bash
git pull origin master
```

### 4. Adicionar a variável de ambiente

```bash
# Editar o arquivo .env
nano .env

# Adicionar esta linha (se não existir):
NEXT_PUBLIC_APP_URL=https://b2b-seo.jzo3qo.easypanel.host
```

### 5. Instalar dependências (se necessário)

```bash
npm install
```

### 6. Fazer build da aplicação

```bash
npm run build
```

### 7. Reiniciar o servidor

```bash
# Se estiver usando PM2:
pm2 restart all

# Ou se estiver usando docker:
docker-compose restart

# Ou se estiver usando systemd:
sudo systemctl restart seu-servico
```

## ✅ Verificação

Após reiniciar, verifique os logs para confirmar que não há mais o erro:

```bash
# Se usando PM2:
pm2 logs

# Se usando docker:
docker-compose logs -f

# Se usando systemctl:
sudo journalctl -u seu-servico -f
```

## 🎯 O Que Foi Corrigido

### Commit 1: Detecção de Gênero Automática
- ✅ Implementa detecção inteligente de gênero do título
- ✅ Mapeia português → inglês (MALE, FEMALE, BOY, GIRL, etc.)
- ✅ Sistema de fallback: título → características → UNISSEX

### Commit 2: Correção IPv6 Básica
- ✅ Altera `localhost` para `127.0.0.1` nas URLs internas

### Commit 3: Solução Definitiva (ATUAL)
- ✅ Cria função `getApiBaseUrlFromRequest()` 
- ✅ Detecta automaticamente a URL base do request
- ✅ Usa variável `NEXT_PUBLIC_APP_URL` em produção
- ✅ Funciona com qualquer porta (80, 3000, etc.)
- ✅ Resolve problema de IPv6 definitivamente

## 📝 Arquivo Criado

```typescript
// src/lib/api-url.ts
export function getApiBaseUrlFromRequest(request: Request): string {
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  return getApiBaseUrl();
}
```

## 🔄 Arquivos Modificados

1. `src/lib/api-url.ts` (NOVO)
2. `src/app/api/anymarket/sync-batch-products/route.ts`
3. `src/app/api/anymarket/update-product/route.ts`
4. `src/app/api/analyze-images-batch/route.ts`
5. `src/app/api/analyze-images-batch-stream/route.ts`
6. `src/app/api/optimize-batch-no-crop-stream/route.ts`
7. `env-config-example.txt`

## ⚡ Teste Final

Após reiniciar o servidor:

1. Acesse a aplicação: `https://b2b-seo.jzo3qo.easypanel.host`
2. Vá para a página de produtos
3. Selecione alguns produtos
4. Clique em "Sincronizar em Lote"
5. Verifique que não há mais o erro `ECONNREFUSED`

## 🆘 Troubleshooting

### Erro persiste após atualizar?

**Verifique se o .env está correto:**

```bash
cat .env | grep NEXT_PUBLIC_APP_URL
```

Deve mostrar:
```
NEXT_PUBLIC_APP_URL=https://b2b-seo.jzo3qo.easypanel.host
```

**Limpe o cache e rebuild:**

```bash
rm -rf .next
npm run build
pm2 restart all
```

### Porta diferente?

Se o seu VPS rodar em porta diferente, ajuste a URL:

```env
# Exemplo com porta 8080:
NEXT_PUBLIC_APP_URL=https://seu-dominio.com:8080

# Exemplo com subdomínio:
NEXT_PUBLIC_APP_URL=https://api.seu-dominio.com
```

## 📞 Suporte

Se o erro persistir, verifique:

1. ✅ Variável `NEXT_PUBLIC_APP_URL` está no `.env`
2. ✅ Servidor foi reiniciado após adicionar a variável
3. ✅ Build foi refeito (`npm run build`)
4. ✅ Porta correta na URL (80, 443, etc.)

---

**Última Atualização:** 24/11/2025  
**Commits:** 5ea8f54 → 47545b0 → f96e865


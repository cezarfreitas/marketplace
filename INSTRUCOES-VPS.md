# 🚀 Instruções para Atualizar o VPS

## ✅ ATUALIZAÇÃO: Detecção Automática Implementada!

**A partir do commit `5b4e962`, a variável `NEXT_PUBLIC_APP_URL` NÃO é mais obrigatória!**

O sistema agora detecta automaticamente a URL base a partir dos headers do request:
- ✅ Detecta automaticamente o domínio
- ✅ Detecta automaticamente a porta
- ✅ Detecta automaticamente o protocolo (http/https)

**Você pode remover a variável `NEXT_PUBLIC_APP_URL` do `.env` se quiser!**

## 📋 Passos SIMPLES para Atualizar

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

### 4. Fazer build da aplicação

```bash
npm run build
```

### 5. Reiniciar o servidor

```bash
# Se estiver usando PM2:
pm2 restart all

# Ou se estiver usando docker:
docker-compose restart

# Ou se estiver usando systemd:
sudo systemctl restart seu-servico
```

**É SÓ ISSO! Não precisa mais configurar variáveis de ambiente!** 🎉

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

### Commit 1: Detecção de Gênero Automática (5ea8f54)
- ✅ Implementa detecção inteligente de gênero do título
- ✅ Mapeia português → inglês (MALE, FEMALE, BOY, GIRL, etc.)
- ✅ Sistema de fallback: título → características → UNISSEX

### Commit 2: Correção IPv6 Básica (47545b0)
- ✅ Altera `localhost` para `127.0.0.1` nas URLs internas

### Commit 3: Solução com Variável de Ambiente (f96e865)
- ✅ Cria função `getApiBaseUrlFromRequest()` 
- ✅ Detecta automaticamente a URL base do request
- ✅ Usa variável `NEXT_PUBLIC_APP_URL` em produção
- ✅ Funciona com qualquer porta (80, 3000, etc.)
- ✅ Resolve problema de IPv6 definitivamente

### Commit 4: Logs de Debug (f618817)
- ✅ Adiciona logs detalhados para diagnóstico
- ✅ Mostra URL, ambiente e variáveis de configuração

### Commit 5: Detecção 100% Automática (5b4e962) ⭐ **ATUAL**
- ✅ **Remove necessidade de `NEXT_PUBLIC_APP_URL`**
- ✅ Detecta automaticamente do header do request
- ✅ Funciona em qualquer ambiente sem configuração
- ✅ Aplica em `optimize-batch-no-crop-stream`
- ✅ Aplica em `analyze-images-batch-stream`

## 🔧 Como Funciona a Detecção Automática

A função `getApiBaseUrlFromRequest()` detecta automaticamente a URL base:

```typescript
// src/lib/api-url.ts
export function getApiBaseUrlFromRequest(request: Request): string {
  const host = request.headers.get('host');              // Ex: b2b-seo.jzo3qo.easypanel.host
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;  // Ex: https://b2b-seo.jzo3qo.easypanel.host
  }
  
  return getApiBaseUrl();  // Fallback
}
```

**Exemplos de Detecção:**

| Ambiente | Host Header | Protocolo | URL Detectada |
|----------|-------------|-----------|---------------|
| VPS (Porta 80) | `b2b-seo.jzo3qo.easypanel.host` | `https` | `https://b2b-seo.jzo3qo.easypanel.host` ✅ |
| Local (Porta 3000) | `localhost:3000` | `http` | `http://localhost:3000` ✅ |
| Docker (Porta 8080) | `meuapp.com:8080` | `https` | `https://meuapp.com:8080` ✅ |

**Resultado:**
- ✅ Sempre detecta corretamente
- ✅ Não precisa configuração manual
- ✅ Funciona em qualquer ambiente

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


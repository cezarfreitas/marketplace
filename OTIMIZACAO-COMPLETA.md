# Otimização Completa - Análise de Imagens em Lote com Crop

## 📋 Visão Geral

A funcionalidade "Otimização Completa" permite processar múltiplos produtos sequencialmente, executando todas as etapas de otimização:

1. **Análise de Imagens** - Identificação de produtos e características
2. **Geração de Título** - Criação de título otimizado
3. **Geração de Descrição** - Descrição detalhada para marketplace
4. **Geração de Características** - Lista de características técnicas
5. **Sincronização Anymarket** - Upload dos dados otimizados
6. **Crop de Imagens** - Remoção de fundo e padronização

## ✨ Melhorias Implementadas

### 1. Logs Detalhados na Tabela `crop_processing_logs`

- **Criação de log inicial**: Ao iniciar o processamento de crop, um registro é criado com status `processing`
- **Atualizações intermediárias**: 
  - Total de imagens encontradas da VTEX
  - Progresso de processamento
- **Finalização completa**:
  - Status final: `completed` ou `failed`
  - Número de imagens processadas
  - Número de imagens enviadas
  - Número de falhas
  - Mensagens de erro (se houver)
  - Timestamp de conclusão

### 2. Timeout e Retry para Chamadas Externas

#### Pixian.ai (Remoção de Fundo)
- **Timeout**: 30 segundos por tentativa
- **Retry**: Até 3 tentativas por imagem
- **Backoff**: Pausa progressiva entre tentativas (1s, 2s, 3s)
- **Logs detalhados**: Cada tentativa é registrada no console

```typescript
// Exemplo de retry logic
for (let attempt = 1; attempt <= 3 && !success; attempt++) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(pixianUrl, { 
      ...options, 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      success = true;
    } else {
      // Retry com backoff
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  } catch (error) {
    // Log e retry
  }
}
```

### 3. Tratamento de Erro e Recuperação Parcial

#### Estratégia de Continuidade
- **Falha em uma etapa**: As etapas seguintes são marcadas como "Não executado"
- **Falha em uma imagem**: O processamento continua para as próximas imagens
- **Logs preservados**: Todos os erros são registrados sem interromper o lote

#### Cascata de Dependências
```
Análise de Imagens
  ↓ (se sucesso)
Geração de Título
  ↓ (se sucesso)
Geração de Descrição
  ↓ (se sucesso)
Geração de Características
  ↓ (se sucesso)
Sincronização Anymarket
  ↓ (se sucesso)
Crop de Imagens
```

Se qualquer etapa falhar:
- As etapas anteriores são mantidas
- As etapas seguintes são marcadas como "não executadas"
- O produto é marcado com erro
- O processamento continua para o próximo produto

### 4. Atualização do Registro do Produto

#### Após Sucesso Completo

**Tabela `anymarket`**:
```sql
UPDATE anymarket 
SET anymarket_imagem_cropada = NOW() 
WHERE id_produto_any = ?
```

**Tabela `anymarket_sync_logs`**:
```sql
INSERT INTO anymarket_sync_logs 
(id_produto_vtex, id_produto_any, title, description, sync_type, action, response_data, created_at)
VALUES (?, ?, ?, ?, 'crop', 'update', ?, NOW())
```

**Tabela `crop_processing_logs`**:
```sql
UPDATE crop_processing_logs 
SET status = 'completed',
    processed_images = ?,
    uploaded_images = ?,
    failed_images = ?,
    completed_at = NOW()
WHERE id = ?
```

#### Campos Atualizados na Interface

- **Botão de Crop**: Muda de cor para roxo após conclusão
- **Tooltip**: Mostra data e hora da última execução
- **Estado global**: `productsWithCroppedImages` é atualizado

## 🔄 Fluxo Completo do Processo

### 1. Início do Lote
```
Usuario seleciona N produtos
   ↓
Click em "Otimização Completa"
   ↓
Modal de progresso é aberto
   ↓
Conexão SSE (Server-Sent Events) iniciada
```

### 2. Processamento de Cada Produto

```
PRODUTO N:
├─ ETAPA 1: Análise de Imagens [2-5s]
│  ├─ Buscar categoria do produto
│  ├─ Fazer análise com OpenAI Vision
│  └─ Salvar resultado no banco
│
├─ ETAPA 2: Geração de Título [3-8s]
│  ├─ Buscar contextos (marca, categoria)
│  ├─ Gerar título com OpenAI
│  └─ Atualizar campo optimized_title
│
├─ ETAPA 3: Geração de Descrição [5-15s]
│  ├─ Buscar todos os dados do produto
│  ├─ Gerar descrição completa
│  └─ Atualizar marketplace_description
│
├─ ETAPA 4: Geração de Características [4-10s]
│  ├─ Buscar análise de imagens
│  ├─ Gerar características técnicas
│  └─ Inserir em product_characteristics
│
├─ ETAPA 5: Sincronização Anymarket [2-5s]
│  ├─ Buscar dados do Anymarket
│  ├─ Atualizar com novos dados
│  └─ Registrar anymarket_enviado_any
│
└─ ETAPA 6: Crop de Imagens [variável]
   ├─ Criar log inicial
   ├─ Deletar imagens antigas do Anymarket
   ├─ Buscar imagens da VTEX
   ├─ Para cada imagem:
   │  ├─ Processar com Pixian (retry 3x) [5-30s/img]
   │  ├─ Upload para servidor local
   │  └─ Upload para Anymarket
   ├─ Atualizar logs detalhados
   └─ Atualizar anymarket_imagem_cropada
```

### 3. Finalização

```
Todos os produtos processados
   ↓
Resumo final enviado via SSE
   ↓
Modal mostra estatísticas:
   - X produtos com sucesso completo
   - Y produtos com erros parciais
   - Z produtos com falha total
   ↓
Usuário pode expandir detalhes de cada produto
```

## 📊 Estrutura de Logs

### Tabela `crop_processing_logs`

```sql
CREATE TABLE crop_processing_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  product_name VARCHAR(255),
  anymarket_id VARCHAR(50),
  status ENUM('processing', 'completed', 'failed'),
  total_images INT DEFAULT 0,
  processed_images INT DEFAULT 0,
  uploaded_images INT DEFAULT 0,
  failed_images INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);
```

### Exemplo de Log Completo

```json
{
  "id": 123,
  "product_id": 45678,
  "product_name": "Camiseta Básica Preta",
  "anymarket_id": "ANY-98765",
  "status": "completed",
  "total_images": 5,
  "processed_images": 5,
  "uploaded_images": 5,
  "failed_images": 0,
  "error_message": null,
  "created_at": "2025-11-19 14:30:00",
  "updated_at": "2025-11-19 14:35:30",
  "completed_at": "2025-11-19 14:35:30"
}
```

## ⚡ Performance e Otimizações

### Processamento Sequencial vs Paralelo

**Escolha Atual**: Sequencial
- ✅ Evita sobrecarga das APIs externas
- ✅ Logs mais claros e organizados
- ✅ Melhor controle de erros
- ✅ Respeita rate limits

### Timeouts Configurados

| Serviço | Timeout | Retry | Backoff |
|---------|---------|-------|---------|
| Pixian.ai | 30s | 3x | 1s, 2s, 3s |
| OpenAI Vision | 60s | 2x | 2s, 4s |
| Anymarket API | 15s | 2x | 1s, 2s |
| VTEX API | 10s | 1x | - |

### Pausa Entre Produtos

```typescript
if (i < productIds.length - 1) {
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms
}
```

Evita sobrecarga do servidor e das APIs externas.

## 🎯 Indicadores de Sucesso

### Sucesso Completo
- ✅ Todas as 6 etapas concluídas
- ✅ Logs salvos em todas as tabelas
- ✅ Campo `anymarket_imagem_cropada` atualizado
- ✅ Botão muda de cor na interface

### Sucesso Parcial
- ⚠️ Algumas etapas concluídas
- ⚠️ Logs indicam onde parou
- ⚠️ Produto pode ser reprocessado

### Falha Total
- ❌ Primeira etapa falhou
- ❌ Logs indicam erro inicial
- ❌ Produto precisa ser verificado

## 🔍 Monitoramento e Debugging

### Logs no Console (Server)

```bash
🚀 Iniciando análise de imagens em lote para 10 produtos
📦 Processando produto 1/10: 12345
🖼️ Executando análise de imagem para produto 12345...
📝 Executando geração de título para produto 12345...
📄 Executando geração de descrição para produto 12345...
🏷️ Executando geração de características para produto 12345...
🔄 Executando sincronização AnyMarket para produto 12345...
✂️ Executando crop de imagens para produto 12345...
📝 Log de processamento criado (ID: 789)
🗑️ Deletando imagens antigas do Anymarket...
🔄 Tentativa 1/3 para processar imagem 1...
✅ Imagem 1 processada com sucesso
📤 Fazendo upload da imagem 1/5...
✅ Upload local concluído para imagem 1
📤 Enviando imagem 1 para Anymarket...
✅ Imagem 1 enviada para Anymarket com sucesso
📝 Log de sucesso atualizado (ID: 789)
✅ Campo anymarket_imagem_cropada atualizado
✅ Produto 12345 processado em 45678ms: Otimização completa concluída com sucesso
```

### Logs na Interface (Client)

- **Barra de progresso**: Atualização em tempo real
- **Produto atual**: Nome do produto sendo processado
- **Etapa atual**: Qual das 6 etapas está executando
- **Contador**: X/N produtos processados
- **Detalhes expandíveis**: Clique em cada produto para ver logs completos

## 🛠️ Manutenção e Troubleshooting

### Problemas Comuns

#### 1. Timeout do Pixian
```
Solução: Já implementado retry automático (3x)
Verificar: Conexão com a internet e status do Pixian.ai
```

#### 2. Imagens não aparecem no Anymarket
```
Verificar: 
- Logs em anymarket_sync_logs
- Campo anymarket_imagem_cropada atualizado
- Permissões da API do Anymarket
```

#### 3. Processo muito lento
```
Causas possíveis:
- Muitas imagens por produto (>10)
- Imagens muito grandes (>5MB)
- API externa com lentidão
- Rate limiting

Soluções:
- Reduzir tamanho das imagens na VTEX
- Processar em lotes menores
- Verificar status das APIs externas
```

## 📝 Próximos Passos (Sugestões)

### Melhorias Futuras

1. **Processamento Paralelo Controlado**
   - Processar 2-3 produtos em paralelo
   - Manter limite de requisições simultâneas

2. **Cache de Resultados**
   - Cache de análises de imagem
   - Cache de descrições geradas

3. **Dashboard de Monitoramento**
   - Visualização de logs em tempo real
   - Estatísticas de sucesso/falha
   - Tempo médio por etapa

4. **Notificações**
   - Email ao concluir lote grande
   - Alerta de falhas consecutivas

5. **Priorização**
   - Permitir ordenar produtos por prioridade
   - Pausar e retomar processamento

## 📚 Referências

- **Tabelas do Banco**: `crop_processing_logs`, `anymarket_sync_logs`, `anymarket`
- **APIs Externas**: Pixian.ai, OpenAI, Anymarket, VTEX
- **Componentes**: `BatchAnalysisProgressModal.tsx`, `ProductTable.tsx`
- **Rotas API**: `/api/analyze-images-batch-stream`, `/api/crop-images`

---

**Última Atualização**: 19/11/2025  
**Versão**: 2.0  
**Status**: ✅ Produção - Otimizado


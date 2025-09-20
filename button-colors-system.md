# Sistema de Cores dos Botões - Produtos

## 🎨 **Sistema de Cores Implementado**

Cada botão de ação na tabela de produtos agora usa um sistema de cores específico baseado no status:

### 📷 **Botão Análise de Imagem**
- **🔘 Cinza**: Imagem não analisada
- **🔵 Azul** (`#3b82f6`): Imagem já analisada (`has_image_analysis = 1`)

### 📝 **Botão Gerar Título**
- **🔘 Cinza**: Título não gerado
- **🩷 Rosa** (`#ec4899`): Título já gerado (`has_optimized_title = 1`)

### 📄 **Botão Gerar Descrição**
- **🔘 Cinza**: Descrição não gerada
- **🟡 Amarelo Mostarda** (`#eab308`): Descrição já gerada (`has_generated_description = 1`)

### 📋 **Botão Gerar Características**
- **🔘 Cinza**: Características não geradas
- **🟠 Laranja** (`#f97316`): Características já geradas (`has_generated_characteristics = 1`)

### 🔄 **Botão Sincronizar Anymarket**
- **🔘 Cinza**: Produto não sincronizado
- **🟡 Amarelo Mostarda** (`#eab308`): Produto sincronizado (`has_anymarket_sync = 1`)
- **🟢 Verde** (`#22c55e`): Produto enviado para Anymarket (`enviado_any` preenchido)

### ✂️ **Botão Cropar Imagens**
- **🔘 Cinza**: Imagens não cropadas
- **🟡 Amarelo Mostarda** (`#eab308`): Imagens já cropadas (`productsWithCroppedImages`)

## 🎯 **Lógica de Cores**

### **Prioridade de Cores:**
1. **🟢 Verde**: Status mais avançado (enviado para Anymarket)
2. **🔵 Azul**: Análise de imagem processada
3. **🩷 Rosa**: Título gerado
4. **🟠 Laranja**: Características geradas
5. **🟡 Amarelo Mostarda**: Outros processamentos concluídos
6. **🔘 Cinza**: Não processado

### **Implementação Técnica:**

```javascript
// Exemplo: Botão Análise de Imagem
style={{
  backgroundColor: product.has_image_analysis || productsWithImageAnalysis.includes(product.id) 
    ? '#3b82f6' // blue-500
    : undefined
}}

// Exemplo: Botão Sincronizar Anymarket (com prioridade)
style={{
  backgroundColor: product.anymarket_enviado_any
    ? '#22c55e' // green-500 (prioridade máxima)
    : product.has_anymarket_sync || productsWithAnymarketSync.includes(product.id) 
    ? '#eab308' // yellow-500
    : undefined
}}
```

## 📊 **Resumo das Cores**

| Botão | Não Processado | Processado | Especial |
|-------|----------------|------------|----------|
| 📷 Análise de Imagem | 🔘 Cinza | 🔵 Azul | - |
| 📝 Gerar Título | 🔘 Cinza | 🩷 Rosa | - |
| 📄 Gerar Descrição | 🔘 Cinza | 🟡 Amarelo | - |
| 📋 Gerar Características | 🔘 Cinza | 🟠 Laranja | - |
| 🔄 Sincronizar Anymarket | 🔘 Cinza | 🟡 Amarelo | 🟢 Verde (enviado) |
| ✂️ Cropar Imagens | 🔘 Cinza | 🟡 Amarelo | - |

## 🎨 **Benefícios do Sistema**

- **🔍 Identificação Visual**: Status imediato de cada produto
- **📈 Progresso**: Cores indicam o progresso do processamento
- **🎯 Priorização**: Verde indica status mais avançado
- **♿ Acessibilidade**: Contraste adequado para leitura
- **📱 Responsivo**: Funciona em todos os dispositivos

## 🚀 **Status: ✅ IMPLEMENTADO**

Todos os botões agora seguem o sistema de cores hierárquico, proporcionando uma experiência visual intuitiva e informativa.

# Resumo Detalhado da Estrutura do Banco de Dados

## Visão Geral

O banco de dados do sistema VTEX possui **15 tabelas principais** organizadas em diferentes módulos funcionais:

### 📊 Estatísticas Gerais
- **Total de Tabelas**: 15
- **Tabelas Principais**: 7 (sistema VTEX)
- **Tabelas de IA**: 3 (geração de conteúdo)
- **Tabelas de Características**: 2
- **Tabelas de Sistema**: 3

## 🏗️ Arquitetura por Módulos

### 1. Módulo VTEX Core (7 tabelas)

#### **products_vtex** - Tabela Central
- **Função**: Armazena todos os produtos do sistema
- **Chave Primária**: `id_produto_vtex` (INT)
- **Relacionamentos**: 
  - 1:N com `skus_vtex`
  - N:1 com `brands_vtex`
  - N:1 com `categories_vtex`
  - 1:N com `product_attributes_vtex`
- **Campos Importantes**: name, description, title, is_active, is_visible

#### **brands_vtex** - Marcas
- **Função**: Gerencia marcas dos produtos
- **Chave Primária**: `id_brand_vtex` (INT)
- **Campos Especiais**: contexto (para IA), image_url

#### **categories_vtex** - Categorias Hierárquicas
- **Função**: Sistema de categorias com hierarquia
- **Chave Primária**: `id_category_vtex` (INT)
- **Auto-relacionamento**: `father_category_id` → `id_category_vtex`
- **Campos Especiais**: has_children, contexto (para IA)

#### **skus_vtex** - Variações de Produtos
- **Função**: Gerencia SKUs (variações) dos produtos
- **Chave Primária**: `id_sku_vtex` (INT)
- **Chave Estrangeira**: `id_produto_vtex` → `products_vtex`
- **Relacionamentos**: 1:N com `images_vtex` e `stock_vtex`

#### **images_vtex** - Imagens dos SKUs
- **Função**: Armazena imagens dos SKUs
- **Chave Primária**: `id_photo_vtex` (INT)
- **Chave Estrangeira**: `id_sku_vtex` → `skus_vtex`
- **Campos Especiais**: is_main, position, file_location

#### **stock_vtex** - Controle de Estoque
- **Função**: Gerencia estoque por SKU e warehouse
- **Chave Primária**: `id_stock_vtex` (INT)
- **Chave Estrangeira**: `id_sku_vtex` → `skus_vtex`
- **Campos Especiais**: warehouse_id, warehouse_name, total_quantity

#### **product_attributes_vtex** - Atributos Específicos
- **Função**: Atributos customizados dos produtos
- **Chave Primária**: `id_attribute_vtex` (INT)
- **Chave Estrangeira**: `id_produto_vtex` → `products_vtex`

### 2. Módulo de IA e Geração de Conteúdo (3 tabelas)

#### **descriptions** - Descrições Geradas por IA
- **Função**: Armazena descrições geradas pela OpenAI
- **Chave Estrangeira**: `id_product_vtex` → `products_vtex`
- **Métricas de IA**: tokens_used, cost, response_time, model

#### **titles** - Títulos Gerados por IA
- **Função**: Armazena títulos gerados pela OpenAI
- **Chave Estrangeira**: `id_product_vtex` → `products_vtex`
- **Campos Especiais**: original_title, generation_attempts, is_unique, validation_passed

#### **analise_imagens** - Análises de Imagens
- **Função**: Armazena análises de imagens por IA
- **Chave Estrangeira**: `id_produto_vtex` → `products_vtex`
- **Métricas Especiais**: total_images, valid_images, invalid_images, analysis_quality

### 3. Módulo de Características (2 tabelas)

#### **caracteristicas** - Definições de Características
- **Função**: Define características que podem ser aplicadas aos produtos
- **Chave Primária**: `id` (INT)
- **Campos Especiais**: pergunta_ia, valores_possiveis, categorias

#### **respostas_caracteristicas** - Respostas Geradas
- **Função**: Armazena respostas geradas para características
- **Chave Primária**: `id` (INT)
- **Chave Estrangeira**: `produto_id` → `products_vtex`

### 4. Módulo de Sistema e Integração (3 tabelas)

#### **anymarket** - Sincronização Anymarket
- **Função**: Gerencia sincronização com plataforma Anymarket
- **Chave Primária**: `id` (INT)
- **Relacionamento**: `ref_produto_vtex` → `products_vtex`
- **Campos Especiais**: `id_produto_any` (ID no Anymarket), `data_sincronizacao` (última sincronização)

#### **anymarket_sync_logs** - Logs de Sincronização
- **Função**: Armazena logs detalhados das sincronizações com Anymarket
- **Chave Primária**: `id` (INT)
- **Chave Estrangeira**: `product_id` → `products_vtex`
- **Campos Especiais**: success, response_data (JSON), error_message

#### **usuarios** - Usuários do Sistema
- **Função**: Gerencia usuários e autenticação
- **Chave Primária**: `id` (INT)
- **Campos de Segurança**: senha, role, login_attempts, locked_until

## 🔗 Padrões de Relacionamento

### Relacionamentos 1:N (Um para Muitos)
- `products_vtex` → `skus_vtex`
- `products_vtex` → `product_attributes_vtex`
- `products_vtex` → `descriptions`
- `products_vtex` → `titles`
- `products_vtex` → `analise_imagens`
- `products_vtex` → `respostas_caracteristicas`
- `products_vtex` → `anymarket_sync_logs`
- `skus_vtex` → `images_vtex`
- `skus_vtex` → `stock_vtex`

### Relacionamentos N:1 (Muitos para Um)
- `products_vtex` → `brands_vtex`
- `products_vtex` → `categories_vtex`

### Auto-relacionamentos
- `categories_vtex` → `categories_vtex` (hierarquia de categorias)

## 📈 Padrões de Design

### 1. **Auditoria Universal**
- Todas as tabelas possuem `created_at` e `updated_at`
- Controle de versão automático

### 2. **Soft Delete**
- Uso de campos `is_active` para desativação lógica
- Preserva histórico de dados

### 3. **Integração com IA**
- Múltiplas tabelas armazenam métricas da OpenAI
- Campos padronizados: tokens_used, cost, response_time, model

### 4. **Flexibilidade de Atributos**
- Sistema de atributos dinâmicos via `product_attributes_vtex`
- Características configuráveis via `caracteristicas`

### 5. **Hierarquia de Categorias**
- Suporte a categorias pai/filho
- Campo `has_children` para otimização de consultas

## 🎯 Pontos de Atenção

### 1. **Performance**
- Índices em campos de relacionamento
- Índices em campos de busca (name, is_active)

### 2. **Integridade Referencial**
- Foreign Keys bem definidas
- CASCADE para dependências críticas
- SET NULL para dependências opcionais

### 3. **Escalabilidade**
- Estrutura preparada para grandes volumes
- Separação clara de responsabilidades

### 4. **Integração Externa**
- Suporte a múltiplas plataformas (VTEX, Anymarket)
- Campos de contexto para IA

## 🔧 Recomendações de Manutenção

1. **Monitoramento de Performance**: Acompanhar consultas nas tabelas principais
2. **Backup Regular**: Especialmente tabelas de IA (alto valor agregado)
3. **Limpeza de Dados**: Remover registros antigos de análises de IA
4. **Atualização de Índices**: Revisar periodicamente baseado no uso
5. **Documentação**: Manter documentação atualizada dos relacionamentos

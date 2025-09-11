# Módulos de Importação VTEX

Este diretório contém módulos modulares para importação de dados da VTEX, organizados por tipo de entidade.

## 📁 Estrutura dos Módulos

### ✅ Módulos Implementados

#### 1. **ProductImportModule** (`product-import.ts`)
- **Função**: Importa produtos da VTEX usando RefId
- **Endpoint**: `/api/catalog_system/pvt/products/productgetbyrefid/{refId}`
- **Tabela**: `products_vtex`
- **Chave**: `vtex_id`

**Exemplo de uso:**
```typescript
import { ProductImportModule } from './product-import';

const importer = new ProductImportModule(baseUrl, headers);
const result = await importer.importProductByRefId("TROMOLM0090L1");

if (result.success) {
  console.log(`Produto importado: ${result.data.product.Name}`);
}
```

#### 2. **BrandImportModule** (`brand-import.ts`)
- **Função**: Importa marcas da VTEX usando brand_id
- **Endpoint**: `/api/catalog_system/pvt/brand/{brandId}`
- **Tabela**: `brands_vtex`
- **Chave**: `vtex_id`

**Exemplo de uso:**
```typescript
import { BrandImportModule } from './brand-import';

const importer = new BrandImportModule(baseUrl, headers);
const result = await importer.importBrandById(2000038);

if (result.success) {
  console.log(`Marca importada: ${result.data.brand.name}`);
}
```

#### 3. **CategoryImportModule** (`category-import.ts`)
- **Função**: Importa categorias da VTEX usando category_id
- **Endpoint**: `/api/catalog_system/pvt/category/{categoryId}`
- **Tabela**: `categories_vtex`
- **Chave**: `vtex_id`

**Exemplo de uso:**
```typescript
import { CategoryImportModule } from './category-import';

const importer = new CategoryImportModule(baseUrl, headers);
const result = await importer.importCategoryById(17);

if (result.success) {
  console.log(`Categoria importada: ${result.data.category.name}`);
}
```

#### 4. **SKUImportModule** (`sku-import.ts`)
- **Função**: Importa SKUs da VTEX usando vtex_id do produto
- **Endpoint**: `/api/catalog_system/pvt/sku/stockkeepingunitByProductId/{productVtexId}`
- **Tabela**: `skus_vtex`
- **Chave**: `id` (ID da VTEX)

**Exemplo de uso:**
```typescript
import { SKUImportModule } from './sku-import';

const importer = new SKUImportModule(baseUrl, headers);
const result = await importer.importSkusByProductId(203722893);

if (result.success) {
  console.log(`SKUs importados: ${result.data.importedCount}`);
}
```

#### 5. **ImageImportModule** (`image-import.ts`)
- **Função**: Importa imagens dos SKUs usando ID do SKU
- **Endpoint**: `/api/catalog/pvt/stockkeepingunit/{skuId}/file`
- **Tabela**: `images_vtex`
- **Chave**: `vtex_id`

**Exemplo de uso:**
```typescript
import { ImageImportModule } from './image-import';

const importer = new ImageImportModule(baseUrl, headers);
const result = await importer.importImagesBySkuId(203773035);

if (result.success) {
  console.log(`Imagens importadas: ${result.data.importedCount}`);
}
```

#### 6. **StockImportModule** (`stock-import.ts`)
- **Função**: Importa estoque dos SKUs usando ID do SKU
- **Endpoint**: `/api/logistics/pvt/inventory/skus/{skuId}`
- **Tabela**: `stock_vtex`
- **Filtro**: Apenas `warehouseName = "13"`

**Exemplo de uso:**
```typescript
import { StockImportModule } from './stock-import';

const importer = new StockImportModule(baseUrl, headers);
const result = await importer.importStockBySkuId(203773035);

if (result.success) {
  console.log(`Estoque importado: ${result.data.importedCount} registros`);
}
```

#### 7. **BatchImportModule** (`batch-import.ts`)
- **Função**: Orquestra importação completa em lote usando todos os módulos
- **Fluxo**: Produto → Marca → Categoria → SKUs → Imagens → Estoque
- **Configurável**: Permite escolher quais importações executar

**Exemplo de uso:**
```typescript
import { BatchImportModule } from './batch-import';

const importer = new BatchImportModule(baseUrl, headers);
const result = await importer.importProductByRefId("STAMOLU004021", {
  importProduct: true,
  importBrand: true,
  importCategory: true,
  importSkus: true,
  importImages: true,
  importStock: true,
  skipExisting: false
});
```

### ✅ **Todos os Módulos Implementados!**

## 🔧 Configuração

Todos os módulos utilizam as seguintes variáveis de ambiente:

```env
VTEX_ACCOUNT_NAME=projetoinfluencer
VTEX_ENVIRONMENT=vtexcommercestable
VTEX_APP_KEY=sua_app_key
VTEX_APP_TOKEN=seu_app_token
```

## 📋 Fluxo de Importação Recomendado

1. **Produto** → Importar por RefId
2. **Marca** → Importar usando brand_id do produto
3. **Categoria** → Importar usando category_id do produto
4. **SKUs** → Importar usando productId
5. **Imagens** → Importar para cada SKU
6. **Estoque** → Importar para cada SKU (filtro warehouse = "13")

## 🧪 Testes

Cada módulo possui um script de teste correspondente em `scripts/`:

- `test-product-import-module.js`
- `test-brand-import-module.js`
- `test-category-import-module.js` (a ser criado)
- `test-sku-import-module.js` (a ser criado)
- `test-image-import-module.js` (a ser criado)
- `test-stock-import-module.js` (a ser criado)

## 📝 Comentários e Documentação

Todos os módulos incluem:
- ✅ Comentários detalhados explicando cada passo
- ✅ Documentação JSDoc para métodos públicos
- ✅ Exemplos de uso
- ✅ Tratamento de erros
- ✅ Logs informativos

## 🔄 Benefícios da Modularização

1. **Separação de responsabilidades**: Cada módulo tem uma função específica
2. **Reutilização**: Módulos podem ser usados independentemente
3. **Manutenibilidade**: Mais fácil de debugar e modificar
4. **Testabilidade**: Cada módulo pode ser testado isoladamente
5. **Escalabilidade**: Fácil adicionar novos tipos de importação

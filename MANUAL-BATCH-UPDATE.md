# Manual de Atualização para Suporte a Lotes

## Tarefas Pendentes - Modificar Módulos de Importação

Para completar a funcionalidade de lotes, é necessário modificar os módulos de importação de produtos para aceitar e processar o `batchId`.

### 1. Modificar `src/lib/import-modules/product-import.ts`

**Arquivo**: `src/lib/import-modules/product-import.ts`

**Método a modificar**: `importProductByRefId`

**Alterações necessárias**:

1. Adicionar parâmetro `batchId` ao método:
```typescript
async importProductByRefId(refId: string, batchId: number | null = null): Promise<ProductImportResult> {
```

2. No INSERT (linha ~183), adicionar `batch_id` à lista de campos:
```sql
INSERT INTO products_vtex (
  id_produto_vtex,
  name,
  department_id,
  id_category_vtex,
  id_brand_vtex,
  link_id,
  ref_produto,
  is_visible,
  description,
  description_short,
  release_date,
  keywords,
  title,
  is_active,
  tax_code,
  meta_tag_description,
  supplier_id,
  show_without_stock,
  list_store_id,
  adwords_remarketing_code,
  lomadee_campaign_code,
  batch_id -- ADICIONAR ESTE CAMPO
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

3. Adicionar `batchId` aos valores do INSERT (linha ~206):
```typescript
[
  product.Id,
  product.Name,
  product.DepartmentId,
  product.CategoryId,
  product.BrandId,
  product.LinkId,
  product.RefId,
  product.IsVisible,
  product.Description,
  product.DescriptionShort,
  product.ReleaseDate,
  product.KeyWords,
  product.Title,
  product.IsActive,
  product.TaxCode,
  product.MetaTagDescription,
  product.SupplierId,
  product.ShowWithoutStock,
  null,
  product.AdWordsRemarketingCode,
  product.LomadeeCampaignCode,
  batchId // ADICIONAR ESTE VALOR
]
```

4. Buscar por UPDATE de `products_vtex` no mesmo arquivo e adicionar:
```sql
UPDATE products_vtex SET
  ... (outros campos) ...,
  batch_id = ?
WHERE ...
```

### 2. Modificar `src/lib/import-modules/fast-batch-import.ts`

**Arquivo**: `src/lib/import-modules/fast-batch-import.ts`

**Método a modificar**: `importProductByRefIdFast`

**Linha ~208**: Modificar chamada para passar `batchId`:
```typescript
productResult = await this.productImporter.importProductByRefId(refId, config.batchId);
```

### 3. Atualizar Anymarket também (se necessário)

Se houver importação para `anymarket` table, modificar também em:
- `src/lib/import-modules/anymarket-integration.ts` (se existir)
- Qualquer lugar que faça INSERT/UPDATE na tabela `anymarket`

Adicionar:
```sql
INSERT INTO anymarket (..., batch_id) VALUES (..., ?)
UPDATE anymarket SET ..., batch_id = ? WHERE ...
```

## Executar Script SQL

Antes de testar, executar o script:
```bash
node scripts/run-sql.js scripts/create-batches-table.sql
```

Ou executar diretamente no MySQL:
```sql
source scripts/create-batches-table.sql;
```

## Testar Funcionalidade

1. Acessar `/batches` e criar um lote
2. Acessar `/import` e selecionar o lote criado
3. Fazer uma importação
4. Verificar se produtos foram associados ao lote:
```sql
SELECT id_produto_vtex, name, batch_id FROM products_vtex WHERE batch_id IS NOT NULL;
```

5. Acessar `/products` e filtrar por lote

## Status Atual

✅ Tabela `batches` criada no banco  
✅ APIs REST para gerenciar lotes  
✅ Página de gerenciamento de lotes  
✅ Seletor de lote na página de importação  
✅ Hook de estado atualizado com `batchId`  
✅ Hook de lógica atualizado para passar `batchId`  
✅ API batch-fast modificada para receber `batchId`  
⏳ Módulo product-import precisa ser modificado  
⏳ Módulo fast-batch-import precisa ser modificado  
⏳ Filtro por lote na página de produtos  

## Notas Importantes

- O `batch_id` é opcional (`NULL` é permitido)
- Produtos sem lote continuam funcionando normalmente
- A funcionalidade é apenas organizacional
- Deletar um lote não deleta os produtos, apenas remove a associação


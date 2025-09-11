import { executeQuery } from './db-simple';
import { vtexService } from './vtex-service';
import { validateAndSanitizeProduct, logImportError } from './import-validation';

export interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class ImportService {
  async importBrands(): Promise<ImportResult> {
    try {
      console.log('🚀 Iniciando importação de marcas...');
      
      // Buscar marcas da VTEX
      const brands = await vtexService.getBrands();
      
      let importedCount = 0;
      for (const brand of brands) {
        await executeQuery(
          `INSERT INTO brands (vtex_id, name, is_active, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), is_active = VALUES(is_active), updated_at = NOW()`,
          [brand.id, brand.name, brand.isActive]
        );
        importedCount++;
      }
      
      return {
        success: true,
        message: `${importedCount} marcas importadas com sucesso`,
        data: { importedCount }
      };
    } catch (error: any) {
      console.error('❌ Erro ao importar marcas:', error);
      return {
        success: false,
        message: 'Erro ao importar marcas',
        error: error.message
      };
    }
  }

  async getImportStats(): Promise<any> {
    try {
      const [brandsCount] = await executeQuery('SELECT COUNT(*) as count FROM brands');
      const [categoriesCount] = await executeQuery('SELECT COUNT(*) as count FROM categories');
      const [productsCount] = await executeQuery('SELECT COUNT(*) as count FROM products_vtex');
      
      return {
        brands: brandsCount.count,
        categories: categoriesCount.count,
        products: productsCount.count
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return {
        brands: 0,
        categories: 0,
        products: 0
      };
    }
  }

  async importProducts(): Promise<ImportResult> {
    try {
      console.log('🚀 Iniciando importação de produtos...');
      
      // Buscar produtos da VTEX
      const products = await vtexService.getProducts();
      
      let importedCount = 0;
      for (const product of products) {
        await executeQuery(
          `INSERT INTO products_vtex (vtex_id, name, description, brand_id, category_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), description = VALUES(description), brand_id = VALUES(brand_id), 
           category_id = VALUES(category_id), is_active = VALUES(is_active), updated_at = NOW()`,
          [product.Id, product.Name, product.Description, product.BrandId, product.CategoryId, product.IsActive]
        );
        importedCount++;
      }
      
      return {
        success: true,
        message: `${importedCount} produtos importados com sucesso`,
        data: { importedCount }
      };
    } catch (error: any) {
      console.error('❌ Erro ao importar produtos:', error);
      return {
        success: false,
        message: `Erro ao importar produtos: ${error.message}`,
        data: null
      };
    }
  }

  async importSkus(batchSize: number = 50): Promise<ImportResult> {
    try {
      console.log('🚀 Iniciando importação de SKUs...');
      
      // Buscar SKUs da VTEX
      const skus = await vtexService.getSKUs();
      
      let importedCount = 0;
      for (const sku of skus) {
        await executeQuery(
          `INSERT INTO skus (vtex_id, product_id, name, price, stock, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), price = VALUES(price), stock = VALUES(stock), 
           is_active = VALUES(is_active), updated_at = NOW()`,
          [sku.Id, sku.ProductId, sku.Name, 0, 0, sku.IsActive]
        );
        importedCount++;
      }
      
      return {
        success: true,
        message: `${importedCount} SKUs importados com sucesso`,
        data: { importedCount }
      };
    } catch (error: any) {
      console.error('❌ Erro ao importar SKUs:', error);
      return {
        success: false,
        message: `Erro ao importar SKUs: ${error.message}`,
        data: null
      };
    }
  }

  async getImportHistory(limit: number = 10): Promise<any[]> {
    try {
      const [history] = await executeQuery(`
        SELECT 
          'brand' as type,
          name,
          created_at
        FROM brands 
        ORDER BY created_at DESC 
        LIMIT ?
        UNION ALL
        SELECT 
          'category' as type,
          name,
          created_at
        FROM categories 
        ORDER BY created_at DESC 
        LIMIT ?
        UNION ALL
        SELECT 
          'product' as type,
          name,
          created_at
        FROM products_vtex 
        ORDER BY created_at DESC 
        LIMIT ?
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit, limit, limit, limit]);
      
      return history;
    } catch (error: any) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  async importCategories(): Promise<ImportResult> {
    try {
      console.log('🚀 Iniciando importação de categorias...');
      
      // Buscar categorias da VTEX
      const categories = await vtexService.getCategories();
      
      let importedCount = 0;
      for (const category of categories) {
        await executeQuery(
          `INSERT INTO categories_vtex (vtex_id, name, father_category_id, title, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), title = VALUES(title), updated_at = NOW()`,
          [category.Id, category.Name, category.FatherCategoryId, category.Title, category.IsActive]
        );
        importedCount++;
      }
      
      return {
        success: true,
        message: `${importedCount} categorias importadas com sucesso`,
        data: { importedCount }
      };
    } catch (error: any) {
      console.error('❌ Erro ao importar categorias:', error);
      return {
        success: false,
        message: 'Erro ao importar categorias',
        error: error.message
      };
    }
  }

  async importProduct(productId: number): Promise<ImportResult> {
    try {
      console.log(`🚀 Iniciando importação do produto ${productId}...`);
      
      // Buscar dados da VTEX
      const vtexData = await vtexService.importCompleteProduct(productId);
      
      // Inserir marca
      const [brandResult] = await executeQuery(
        `INSERT INTO brands (vtex_id, name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), is_active = VALUES(is_active), updated_at = NOW()`,
        [vtexData.brand.id, vtexData.brand.name, vtexData.brand.isActive]
      );
      
      // Inserir categoria
      const [categoryResult] = await executeQuery(
        `INSERT INTO categories (vtex_id, name, father_category_id, title, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), title = VALUES(title), updated_at = NOW()`,
        [vtexData.category.Id, vtexData.category.Name, vtexData.category.FatherCategoryId, vtexData.category.Title, vtexData.category.IsActive]
      );
      
      // Inserir produto
      const [productResult] = await executeQuery(
        `INSERT INTO products_vtex (vtex_id, name, department_id, category_id, brand_id, is_visible, description, title, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
        [
          vtexData.product.Id,
          vtexData.product.Name,
          vtexData.product.DepartmentId,
          vtexData.category.Id,
          vtexData.brand.id,
          vtexData.product.IsVisible,
          vtexData.product.Description,
          vtexData.product.Title,
          vtexData.product.IsActive
        ]
      );
      
      console.log(`✅ Produto ${productId} importado com sucesso!`);
      
      return {
        success: true,
        message: `Produto ${productId} importado com sucesso!`,
        data: {
          product: vtexData.product,
          brand: vtexData.brand,
          category: vtexData.category,
          skuCount: vtexData.skus.length,
          imageCount: vtexData.images.length
        }
      };
      
    } catch (error) {
      console.error(`❌ Erro na importação do produto ${productId}:`, error);
      return {
        success: false,
        message: `Erro na importação do produto ${productId}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async importProductByRefId(refId: string): Promise<ImportResult> {
    try {
      console.log(`🚀 Iniciando importação SIMPLES do produto RefId ${refId}...`);
      
      // Buscar apenas o produto da VTEX
      console.log(`📡 Buscando produto da VTEX para RefId ${refId}...`);
      const product = await vtexService.getProductByRefId(refId);
      console.log(`✅ Produto da VTEX recebido:`, {
        id: product.Id,
        name: product.Name,
        refId: product.RefId
      });
      
      // Validar produto antes de inserir
      const validation = validateAndSanitizeProduct(product);
      if (!validation.isValid) {
        logImportError(refId, validation.errors, product);
        return {
          success: false,
          message: `Erro de validação no produto RefId ${refId}`,
          error: validation.errors.join('; ')
        };
      }
      
      // Inserir apenas o produto (sem dependências)
      console.log(`📦 Inserindo produto...`);
      const [productResult] = await executeQuery(
        `INSERT INTO products_vtex (vtex_id, name, department_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
        [
          product.Id,
          product.Name,
          product.DepartmentId,
          product.RefId,
          product.IsVisible,
          product.Description,
          product.Title,
          product.IsActive
        ]
      );
      console.log(`✅ Produto inserido/atualizado:`, productResult);
      
      console.log(`✅ Produto RefId ${refId} importado com sucesso!`);
      
      return {
        success: true,
        message: `Produto RefId ${refId} importado com sucesso!`,
        data: {
          product: product,
          productId: product.Id,
          productName: product.Name
        }
      };
      
    } catch (error) {
      console.error(`❌ Erro na importação do produto RefId ${refId}:`, error);
      return {
        success: false,
        message: `Erro na importação do produto RefId ${refId}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const importService = new ImportService();
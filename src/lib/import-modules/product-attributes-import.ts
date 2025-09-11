import { executeQuery } from '@/lib/database';
import { VtexProductAttributesService, ProductAttribute } from '@/lib/vtex-product-attributes-service';

// Atributos que devem ser desconsiderados na importação
const EXCLUDED_ATTRIBUTES = ['Seller', 'Categoria'];

export interface ProductAttributesImportResult {
  productId: number;
  success: boolean;
  message: string;
  attributesImported?: number;
  error?: string;
}

export class ProductAttributesImportModule {
  private vtexService: VtexProductAttributesService;

  constructor() {
    this.vtexService = new VtexProductAttributesService();
  }

  /**
   * Importar atributos de um produto específico
   */
  async importProductAttributes(productId: number): Promise<ProductAttributesImportResult> {
    try {
      console.log(`📋 Importando atributos do produto ID: ${productId}`);

      // Verificar se o produto existe
      const productExists = await executeQuery(
        'SELECT id FROM products_vtex WHERE id = ?',
        [productId]
      );

      if (!productExists || productExists.length === 0) {
        return {
          productId,
          success: false,
          message: 'Produto não encontrado no banco de dados',
          error: 'Product not found'
        };
      }

      // Buscar atributos da VTEX
      const attributes = await this.vtexService.getProductSpecifications(productId);

      if (!attributes || attributes.length === 0) {
        console.log(`ℹ️ Produto ${productId} não possui atributos`);
        return {
          productId,
          success: true,
          message: 'Produto não possui atributos',
          attributesImported: 0
        };
      }

      // Limpar atributos existentes do produto
      await executeQuery(
        'DELETE FROM product_attributes WHERE product_id = ?',
        [productId]
      );

      // Inserir novos atributos (desconsiderando "Seller" e "Categoria")
      let importedCount = 0;
      for (const attribute of attributes) {
        // Desconsiderar atributos específicos
        if (EXCLUDED_ATTRIBUTES.includes(attribute.Name)) {
          console.log(`⏭️ Atributo "${attribute.Name}" desconsiderado para produto ${productId}`);
          continue;
        }

        try {
          await executeQuery(
            `INSERT INTO product_attributes (product_id, attribute_id, attribute_name, attribute_values, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
             attribute_name = VALUES(attribute_name),
             attribute_values = VALUES(attribute_values),
             updated_at = NOW()`,
            [
              productId,
              attribute.Id,
              attribute.Name,
              JSON.stringify(attribute.Value)
            ]
          );
          importedCount++;
        } catch (error: any) {
          console.error(`❌ Erro ao inserir atributo ${attribute.Name} do produto ${productId}:`, error.message);
        }
      }

      console.log(`✅ ${importedCount} atributos importados para produto ${productId}`);

      return {
        productId,
        success: true,
        message: `${importedCount} atributos importados com sucesso`,
        attributesImported: importedCount
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar atributos do produto ${productId}:`, error.message);
      return {
        productId,
        success: false,
        message: `Erro ao importar atributos: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Importar atributos de múltiplos produtos
   */
  async importMultipleProductAttributes(productIds: number[]): Promise<ProductAttributesImportResult[]> {
    const results: ProductAttributesImportResult[] = [];
    
    console.log(`📋 Importando atributos para ${productIds.length} produtos...`);

    for (const productId of productIds) {
      try {
        const result = await this.importProductAttributes(productId);
        results.push(result);
        
        // Pequena pausa entre produtos
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`❌ Erro ao processar produto ${productId}:`, error.message);
        results.push({
          productId,
          success: false,
          message: `Erro ao processar: ${error.message}`,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalAttributes = results.reduce((sum, r) => sum + (r.attributesImported || 0), 0);
    
    console.log(`🎉 Importação de atributos concluída!`);
    console.log(`✅ Produtos processados com sucesso: ${successCount}/${productIds.length}`);
    console.log(`📊 Total de atributos importados: ${totalAttributes}`);

    return results;
  }

  /**
   * Buscar atributos de um produto do banco de dados
   */
  async getProductAttributes(productId: number): Promise<ProductAttribute[]> {
    try {
      const attributes = await executeQuery(
        'SELECT attribute_id, attribute_name, attribute_values FROM product_attributes WHERE product_id = ? ORDER BY attribute_name',
        [productId]
      );

      return attributes.map((attr: any) => ({
        Id: attr.attribute_id,
        Name: attr.attribute_name,
        Value: JSON.parse(attr.attribute_values)
      }));

    } catch (error: any) {
      console.error(`❌ Erro ao buscar atributos do produto ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Buscar atributos de múltiplos produtos do banco de dados
   */
  async getMultipleProductAttributes(productIds: number[]): Promise<Map<number, ProductAttribute[]>> {
    const results = new Map<number, ProductAttribute[]>();
    
    try {
      const placeholders = productIds.map(() => '?').join(',');
      const attributes = await executeQuery(
        `SELECT product_id, attribute_id, attribute_name, attribute_values 
         FROM product_attributes 
         WHERE product_id IN (${placeholders}) 
         ORDER BY product_id, attribute_name`,
        productIds
      );

      // Agrupar por product_id
      attributes.forEach((attr: any) => {
        if (!results.has(attr.product_id)) {
          results.set(attr.product_id, []);
        }
        
        results.get(attr.product_id)!.push({
          Id: attr.attribute_id,
          Name: attr.attribute_name,
          Value: JSON.parse(attr.attribute_values)
        });
      });

    } catch (error: any) {
      console.error(`❌ Erro ao buscar atributos dos produtos:`, error.message);
    }

    return results;
  }
}

export default ProductAttributesImportModule;

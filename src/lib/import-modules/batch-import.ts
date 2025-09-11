import { ProductImportModule } from './product-import';
import { BrandImportModule } from './brand-import';
import { CategoryImportModule } from './category-import';
import { SKUImportModule } from './sku-import';
import { ImageImportModule } from './image-import';
import { StockImportModule } from './stock-import';

/**
 * Interface para resultado de importação em lote
 */
export interface BatchImportResult {
  success: boolean;
  message: string;
  data?: {
    refId: string;
    productResult?: any;
    brandResult?: any;
    categoryResult?: any;
    skuResult?: any;
    imageResult?: any;
    stockResult?: any;
    totalTime: number;
    errors: string[];
  };
}

/**
 * Interface para configuração de importação em lote
 */
export interface BatchImportConfig {
  importProduct: boolean;
  importBrand: boolean;
  importCategory: boolean;
  importSkus: boolean;
  importImages: boolean;
  importStock: boolean;
  skipExisting: boolean;
}

/**
 * Módulo de Importação em Lote da VTEX
 * 
 * Este módulo orquestra todo o processo de importação usando os módulos individuais.
 * 
 * FLUXO DE IMPORTAÇÃO EM LOTE:
 * 1. Importa produto por RefId
 * 2. Importa marca usando brand_id do produto
 * 3. Importa categoria usando category_id do produto
 * 4. Importa SKUs usando vtex_id do produto
 * 5. Para cada SKU importado:
 *    - Importa imagens do SKU
 *    - Importa estoque do SKU (filtro warehouse = "13")
 * 6. Retorna resultado consolidado
 * 
 * IMPORTANTE: Todas as importações são feitas de forma sequencial e integrada
 */
export class BatchImportModule {
  private productImporter: ProductImportModule;
  private brandImporter: BrandImportModule;
  private categoryImporter: CategoryImportModule;
  private skuImporter: SKUImportModule;
  private imageImporter: ImageImportModule;
  private stockImporter: StockImportModule;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.productImporter = new ProductImportModule(baseUrl, headers);
    this.brandImporter = new BrandImportModule(baseUrl, headers);
    this.categoryImporter = new CategoryImportModule(baseUrl, headers);
    this.skuImporter = new SKUImportModule(baseUrl, headers);
    this.imageImporter = new ImageImportModule(baseUrl, headers);
    this.stockImporter = new StockImportModule(baseUrl, headers);
  }

  /**
   * Importar produto completo em lote por RefId
   * 
   * @param refId - Reference ID do produto (ex: "TROMOLM0090L1")
   * @param config - Configuração de quais importações executar
   * @returns Promise<BatchImportResult> - Resultado da importação em lote
   * 
   * EXEMPLO DE USO:
   * const importer = new BatchImportModule(baseUrl, headers);
   * const result = await importer.importProductByRefId("TROMOLM0090L1", {
   *   importProduct: true,
   *   importBrand: true,
   *   importCategory: true,
   *   importSkus: true,
   *   importImages: true,
   *   importStock: true,
   *   skipExisting: false
   * });
   */
  async importProductByRefId(refId: string, config: BatchImportConfig = {
    importProduct: true,
    importBrand: true,
    importCategory: true,
    importSkus: true,
    importImages: true,
    importStock: true,
    skipExisting: false
  }): Promise<BatchImportResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      console.log(`🚀 INICIANDO IMPORTAÇÃO EM LOTE PARA REFID: ${refId}`);
      console.log('================================================\n');

      const result: BatchImportResult = {
        success: true,
        message: '',
        data: {
          refId,
          totalTime: 0,
          errors: []
        }
      };

      // PASSO 1: Importar Produto
      if (config.importProduct) {
        console.log('📦 PASSO 1: Importando produto...');
        try {
          const productResult = await this.productImporter.importProductByRefId(refId);
          result.data!.productResult = productResult;
          
          if (productResult.success) {
            console.log(`✅ Produto importado: ${productResult.data?.product.Name}`);
          } else {
            console.log(`❌ Erro ao importar produto: ${productResult.message}`);
            errors.push(`Produto: ${productResult.message}`);
            if (!config.skipExisting) {
              result.success = false;
              result.message = `Falha na importação do produto: ${productResult.message}`;
              return result;
            }
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar produto: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          if (!config.skipExisting) {
            result.success = false;
            result.message = errorMsg;
            return result;
          }
        }
      }

      // PASSO 2: Importar Marca (se produto foi importado com sucesso)
      if (config.importBrand && result.data?.productResult?.success) {
        console.log('\n🏷️ PASSO 2: Importando marca...');
        try {
          const product = result.data.productResult.data?.product;
          if (product && product.BrandId) {
            const brandResult = await this.brandImporter.importBrandById(product.BrandId);
            result.data!.brandResult = brandResult;
            
            if (brandResult.success) {
              console.log(`✅ Marca importada: ${brandResult.data?.brand.name}`);
            } else {
              console.log(`❌ Erro ao importar marca: ${brandResult.message}`);
              errors.push(`Marca: ${brandResult.message}`);
            }
          } else {
            console.log('⚠️ Produto não tem brand_id definido');
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar marca: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // PASSO 3: Importar Categoria (se produto foi importado com sucesso)
      if (config.importCategory && result.data?.productResult?.success) {
        console.log('\n📂 PASSO 3: Importando categoria...');
        try {
          const product = result.data.productResult.data?.product;
          if (product && product.CategoryId) {
            const categoryResult = await this.categoryImporter.importCategoryById(product.CategoryId);
            result.data!.categoryResult = categoryResult;
            
            if (categoryResult.success) {
              console.log(`✅ Categoria importada: ${categoryResult.data?.category.Name}`);
            } else {
              console.log(`❌ Erro ao importar categoria: ${categoryResult.message}`);
              errors.push(`Categoria: ${categoryResult.message}`);
            }
          } else {
            console.log('⚠️ Produto não tem category_id definido');
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar categoria: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // PASSO 4: Importar SKUs (se produto foi importado com sucesso)
      if (config.importSkus && result.data?.productResult?.success) {
        console.log('\n📦 PASSO 4: Importando SKUs...');
        try {
          const product = result.data.productResult.data?.product;
          if (product && product.Id) {
            const skuResult = await this.skuImporter.importSkusByProductId(product.Id);
            result.data!.skuResult = skuResult;
            
            if (skuResult.success) {
              console.log(`✅ SKUs importados: ${skuResult.data?.importedCount} novos, ${skuResult.data?.updatedCount} atualizados`);
            } else {
              console.log(`❌ Erro ao importar SKUs: ${skuResult.message}`);
              errors.push(`SKUs: ${skuResult.message}`);
            }
          } else {
            console.log('⚠️ Produto não tem ID definido');
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar SKUs: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // PASSO 5: Importar Imagens e Estoque para cada SKU
      if ((config.importImages || config.importStock) && result.data?.skuResult?.success) {
        console.log('\n🖼️ PASSO 5: Importando imagens e estoque para cada SKU...');
        
        const skus = result.data.skuResult.data?.skus || [];
        let totalImagesImported = 0;
        let totalImagesUpdated = 0;
        let totalStockImported = 0;
        let totalStockUpdated = 0;

        // Variáveis para controlar importação de imagens
        let imagesFound = false;
        let skuWithImages: any = null;
        
        for (let i = 0; i < skus.length; i++) {
          const sku = skus[i];
          console.log(`\n🔍 Processando SKU ${i + 1}/${skus.length}: ${sku.Name} (ID: ${sku.Id})`);

          // Importar Imagens do SKU - Nova lógica: só importar do primeiro SKU que tiver imagens
          if (config.importImages && !imagesFound) {
            console.log(`  🖼️ Verificando imagens do SKU ${sku.Id}...`);
            try {
              const imageResult = await this.imageImporter.importImagesBySkuId(sku.Id);
              
              if (imageResult.success) {
                const importedCount = imageResult.data?.importedCount || 0;
                const updatedCount = imageResult.data?.updatedCount || 0;
                
                if (importedCount > 0 || updatedCount > 0) {
                  // Conseguiu importar imagens - parar aqui
                  totalImagesImported += importedCount;
                  totalImagesUpdated += updatedCount;
                  imagesFound = true;
                  skuWithImages = sku;
                  console.log(`  ✅ Imagens encontradas no SKU ${sku.Id}! ${importedCount} importadas, ${updatedCount} atualizadas`);
                  console.log(`  🛑 Parando busca de imagens - usando apenas este SKU`);
                } else {
                  // SKU não tem imagens, tentar próximo
                  console.log(`  ❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
                }
              } else {
                console.log(`  ❌ Erro ao verificar imagens do SKU ${sku.Id}: ${imageResult.message}`);
              }
            } catch (error: any) {
              const errorMsg = `Erro ao verificar imagens do SKU ${sku.Id}: ${error.message}`;
              console.error(`  ❌ ${errorMsg}`);
            }
          } else if (config.importImages && imagesFound) {
            console.log(`  ⏭️ SKU ${sku.Id} pulado - imagens já importadas do SKU ${skuWithImages?.Id}`);
          }

          // Importar Estoque do SKU
          if (config.importStock) {
            try {
              console.log(`  📦 Importando estoque do SKU ${sku.Id}...`);
              const stockResult = await this.stockImporter.importStockBySkuId(sku.Id);
              
              if (stockResult.success) {
                totalStockImported += stockResult.data?.importedCount || 0;
                totalStockUpdated += stockResult.data?.updatedCount || 0;
                console.log(`  ✅ Estoque: ${stockResult.data?.importedCount} importados, ${stockResult.data?.updatedCount} atualizados`);
              } else {
                console.log(`  ❌ Erro ao importar estoque: ${stockResult.message}`);
                errors.push(`Estoque SKU ${sku.Id}: ${stockResult.message}`);
              }
            } catch (error: any) {
              const errorMsg = `Erro ao importar estoque do SKU ${sku.Id}: ${error.message}`;
              console.error(`  ❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        }

        // Consolidar resultados de imagens e estoque
        result.data!.imageResult = {
          success: true,
          message: `Imagens: ${totalImagesImported} importadas, ${totalImagesUpdated} atualizadas`,
          data: {
            importedCount: totalImagesImported,
            updatedCount: totalImagesUpdated
          }
        };

        result.data!.stockResult = {
          success: true,
          message: `Estoque: ${totalStockImported} importados, ${totalStockUpdated} atualizados`,
          data: {
            importedCount: totalStockImported,
            updatedCount: totalStockUpdated
          }
        };
      }

      // Calcular tempo total
      const totalTime = Date.now() - startTime;
      result.data!.totalTime = totalTime;
      result.data!.errors = errors;

      // Definir mensagem final
      if (errors.length === 0) {
        result.message = `✅ Importação em lote concluída com sucesso em ${totalTime}ms`;
      } else {
        result.message = `⚠️ Importação em lote concluída com ${errors.length} avisos em ${totalTime}ms`;
      }

      console.log(`\n🎉 IMPORTAÇÃO EM LOTE CONCLUÍDA!`);
      console.log(`⏱️ Tempo total: ${totalTime}ms`);
      console.log(`❌ Erros: ${errors.length}`);
      
      return result;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Erro crítico na importação em lote:`, error);
      
      return {
        success: false,
        message: `❌ Erro crítico na importação em lote: ${error.message}`,
        data: {
          refId,
          totalTime,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Importar múltiplos produtos em lote
   */
  async importMultipleProducts(refIds: string[], config: BatchImportConfig): Promise<BatchImportResult[]> {
    console.log(`🚀 INICIANDO IMPORTAÇÃO EM LOTE PARA ${refIds.length} PRODUTOS`);
    console.log('============================================================\n');

    const results: BatchImportResult[] = [];

    for (let i = 0; i < refIds.length; i++) {
      const refId = refIds[i];
      console.log(`\n📦 Processando produto ${i + 1}/${refIds.length}: ${refId}`);
      
      const result = await this.importProductByRefId(refId, config);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Produto ${refId} importado com sucesso`);
      } else {
        console.log(`❌ Falha na importação do produto ${refId}: ${result.message}`);
      }
    }

    console.log(`\n🎉 IMPORTAÇÃO EM LOTE DE ${refIds.length} PRODUTOS CONCLUÍDA!`);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Falhas: ${errorCount}`);

    return results;
  }
}

import { ProductImportModule } from './product-import';
import { BrandImportModule } from './brand-import';
import { CategoryImportModule } from './category-import';
import { SKUImportModule } from './sku-import';
import { ImageImportModule } from './image-import';
import { StockImportModule } from './stock-import';
import { ProductAttributesImportModule } from './product-attributes-import';
import { executeQuery } from '../database';

/**
 * Interface para resultado de importação rápida em lote
 */
export interface FastBatchImportResult {
  refId: string;
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
    attributesResult?: any;
    totalTime: number;
    errors: string[];
  };
}

/**
 * Interface para configuração de importação rápida
 */
export interface FastBatchImportConfig {
  batchSize: number;
  importImages?: boolean;
  importStock?: boolean;
  importAttributes?: boolean;
}

/**
 * Módulo de Importação Rápida em Lote da VTEX
 * 
 * Este módulo otimiza a importação processando múltiplos produtos em paralelo
 * e fazendo consultas em lote para melhorar a performance.
 * 
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * 1. Processamento paralelo de produtos
 * 2. Consultas em lote para verificar existência
 * 3. Cache de marcas e categorias já importadas
 * 4. Processamento otimizado de SKUs e imagens
 * 5. Tratamento de erros não-bloqueante
 */
export class FastBatchImportModule {
  private productImporter: ProductImportModule;
  private brandImporter: BrandImportModule;
  private categoryImporter: CategoryImportModule;
  private skuImporter: SKUImportModule;
  private imageImporter: ImageImportModule;
  private stockImporter: StockImportModule;
  private attributesImporter: ProductAttributesImportModule;
  
  // Cache para evitar importações duplicadas
  private brandCache = new Map<number, any>();
  private categoryCache = new Map<number, any>();

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.productImporter = new ProductImportModule(baseUrl, headers);
    this.brandImporter = new BrandImportModule(baseUrl, headers);
    this.categoryImporter = new CategoryImportModule(baseUrl, headers);
    this.skuImporter = new SKUImportModule(baseUrl, headers);
    this.imageImporter = new ImageImportModule(baseUrl, headers);
    this.stockImporter = new StockImportModule(baseUrl, headers);
    this.attributesImporter = new ProductAttributesImportModule();
  }

  /**
   * Importar múltiplos produtos em lote com processamento paralelo
   */
  async importMultipleProductsFast(
    refIds: string[], 
    config: FastBatchImportConfig
  ): Promise<FastBatchImportResult[]> {
    const startTime = Date.now();
    console.log(`🚀 INICIANDO IMPORTAÇÃO RÁPIDA PARA ${refIds.length} PRODUTOS`);
    console.log('============================================================\n');

    // Dividir em lotes para processamento otimizado
    const batchSize = Math.min(config.batchSize || 10, 10); // Ajustado para 10
    const batches = [];
    for (let i = 0; i < refIds.length; i += batchSize) {
      batches.push(refIds.slice(i, i + batchSize));
    }

    const results: FastBatchImportResult[] = [];

    // Processar cada lote com controle de concorrência
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} produtos)`);
      
      // Processar produtos do lote sequencialmente para evitar sobrecarga
      const batchResults: FastBatchImportResult[] = [];
      for (const refId of batch) {
        try {
          const result = await this.importProductByRefIdFast(refId, config);
          batchResults.push(result);
          
          // Pequena pausa entre produtos para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error: any) {
          console.error(`❌ Erro ao processar ${refId}:`, error.message);
          batchResults.push({
            refId,
            success: false,
            message: error.message
          });
        }
      }
      
      results.push(...batchResults);
      console.log(`✅ Lote ${batchIndex + 1} concluído`);
      
      // Pausa entre lotes para evitar sobrecarga do banco
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`\n🎉 IMPORTAÇÃO RÁPIDA CONCLUÍDA!`);
    console.log(`⏱️ Tempo total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Falhas: ${errorCount}`);
    console.log(`📊 Taxa de sucesso: ${((successCount / refIds.length) * 100).toFixed(1)}%`);

    return results;
  }

  /**
   * Importar produto individual com otimizações
   */
  async importProductByRefIdFast(
    refId: string, 
    config: FastBatchImportConfig
  ): Promise<FastBatchImportResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`📦 Importando produto: ${refId}`);

      // PASSO 1: Importar produto
      let productResult = null;
      try {
        productResult = await this.productImporter.importProductByRefId(refId);
        if (!productResult.success) {
          errors.push(`Erro ao importar produto: ${productResult.message}`);
        }
      } catch (error: any) {
        errors.push(`Erro ao importar produto: ${error.message}`);
      }

      if (!productResult?.success) {
        return {
          refId,
          success: false,
          message: `Falha na importação do produto ${refId}`,
          data: {
            refId,
            totalTime: Date.now() - startTime,
            errors
          }
        };
      }

      const product = productResult.data?.product;
      if (!product) {
        return {
          refId,
          success: false,
          message: `Produto ${refId} não encontrado na VTEX`,
          data: {
            refId,
            totalTime: Date.now() - startTime,
            errors: [...errors, 'Produto não encontrado na VTEX']
          }
        };
      }

      // PASSO 2: Importar marca (com cache)
      let brandResult = null;
      if (product.BrandId) {
        try {
          // Verificar cache primeiro
          if (this.brandCache.has(product.BrandId)) {
            brandResult = this.brandCache.get(product.BrandId);
            console.log(`  🏷️ Marca ${product.BrandId} encontrada no cache`);
          } else {
            brandResult = await this.brandImporter.importBrandById(product.BrandId);
            if (brandResult.success) {
              this.brandCache.set(product.BrandId, brandResult);
            }
          }
          
          if (!brandResult.success) {
            errors.push(`Erro ao importar marca: ${brandResult.message}`);
          }
        } catch (error: any) {
          errors.push(`Erro ao importar marca: ${error.message}`);
        }
      }

      // PASSO 3: Importar categoria (com cache)
      let categoryResult = null;
      if (product.CategoryId) {
        try {
          // Verificar cache primeiro
          if (this.categoryCache.has(product.CategoryId)) {
            categoryResult = this.categoryCache.get(product.CategoryId);
            console.log(`  📂 Categoria ${product.CategoryId} encontrada no cache`);
          } else {
            categoryResult = await this.categoryImporter.importCategoryById(product.CategoryId);
            if (categoryResult.success) {
              this.categoryCache.set(product.CategoryId, categoryResult);
            }
          }
          
          if (!categoryResult.success) {
            errors.push(`Erro ao importar categoria: ${categoryResult.message}`);
          }
        } catch (error: any) {
          errors.push(`Erro ao importar categoria: ${error.message}`);
        }
      }

      // PASSO 4: Importar SKUs
      let skuResult = null;
      if (product.Id) {
        try {
          skuResult = await this.skuImporter.importSkusByProductId(product.Id);
          if (!skuResult.success) {
            errors.push(`Erro ao importar SKUs: ${skuResult.message}`);
          }
        } catch (error: any) {
          errors.push(`Erro ao importar SKUs: ${error.message}`);
        }
      }

      // PASSO 5: Importar imagens e estoque para cada SKU (em paralelo)
      let imageResult = null;
      let stockResult = null;
      
      if (config.importImages || config.importStock) {
        const skus = skuResult?.data?.skus || [];
        
        if (skus.length > 0) {
          // Processar SKUs sequencialmente para imagens (só importar do primeiro que tiver)
          let imagesFound = false;
          let skuWithImages: any = null;
          
          for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            const skuResults: any = {};
            
            // Importar imagens do SKU - Nova lógica: só importar do primeiro que tiver imagens
            if (config.importImages && !imagesFound) {
              console.log(`  🖼️ Verificando imagens do SKU ${sku.Id}...`);
              try {
                const imgResult = await this.imageImporter.importImagesBySkuId(sku.Id);
                
                if (imgResult.success) {
                  const importedCount = imgResult.data?.importedCount || 0;
                  const updatedCount = imgResult.data?.updatedCount || 0;
                  
                  if (importedCount > 0 || updatedCount > 0) {
                    // Conseguiu importar imagens - parar aqui
                    skuResults.images = imgResult;
                    imagesFound = true;
                    skuWithImages = sku;
                    console.log(`  ✅ Imagens encontradas no SKU ${sku.Id}! ${importedCount} importadas, ${updatedCount} atualizadas`);
                    console.log(`  🛑 Parando busca de imagens - usando apenas este SKU`);
                  } else {
                    // SKU não tem imagens, tentar próximo
                    console.log(`  ❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
                  }
                } else {
                  console.log(`  ❌ Erro ao verificar imagens do SKU ${sku.Id}: ${imgResult.message}`);
                }
              } catch (error: any) {
                const errorMsg = `Erro ao verificar imagens do SKU ${sku.Id}: ${error.message}`;
                console.error(`  ❌ ${errorMsg}`);
              }
            } else if (config.importImages && imagesFound) {
              console.log(`  ⏭️ SKU ${sku.Id} pulado - imagens já importadas do SKU ${skuWithImages?.Id}`);
            }
            
            // Importar estoque do SKU
            if (config.importStock) {
              try {
                console.log(`  📦 Importando estoque do SKU ${sku.Id}...`);
                const stockRes = await this.stockImporter.importStockBySkuId(sku.Id);
                skuResults.stock = stockRes;
                
                if (stockRes.success) {
                  console.log(`  ✅ Estoque: ${stockRes.data?.importedCount} importados, ${stockRes.data?.updatedCount} atualizados`);
                } else {
                  console.log(`  ❌ Erro ao importar estoque: ${stockRes.message}`);
                  errors.push(`Estoque SKU ${sku.Id}: ${stockRes.message}`);
                }
              } catch (error: any) {
                const errorMsg = `Erro ao importar estoque do SKU ${sku.Id}: ${error.message}`;
                console.error(`  ❌ ${errorMsg}`);
                errors.push(errorMsg);
              }
            }
            
            // Armazenar resultados
            if (config.importImages && skuResults.images) {
              imageResult = skuResults.images;
            }
            if (config.importStock && skuResults.stock) {
              stockResult = skuResults.stock;
            }
          }
          
          // Consolidar resultados de imagens
          if (config.importImages && imageResult) {
            console.log(`✅ Imagens processadas: ${imageResult.data?.importedCount || 0} importadas, ${imageResult.data?.updatedCount || 0} atualizadas`);
          }
          
          // Consolidar resultados de estoque
          if (config.importStock && stockResult) {
            console.log(`✅ Estoque processado: ${stockResult.data?.importedCount || 0} importados, ${stockResult.data?.updatedCount || 0} atualizados`);
          }
        }
      }

      // PASSO 6: Importar atributos do produto
      let attributesResult = null;
      if (config.importAttributes && product?.Id) {
        try {
          console.log(`📋 Importando atributos do produto ${product.Id}...`);
          attributesResult = await this.attributesImporter.importProductAttributes(product.Id);
          
          if (attributesResult.success) {
            console.log(`✅ Atributos: ${attributesResult.attributesImported} importados`);
          } else {
            console.log(`❌ Erro ao importar atributos: ${attributesResult.message}`);
            errors.push(`Atributos: ${attributesResult.message}`);
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar atributos do produto ${product.Id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      const totalTime = Date.now() - startTime;
      const hasErrors = errors.length > 0;
      
      return {
        refId,
        success: !hasErrors,
        message: hasErrors 
          ? `Produto ${refId} importado com ${errors.length} avisos`
          : `Produto ${refId} importado com sucesso`,
        data: {
          refId,
          productResult,
          brandResult,
          categoryResult,
          skuResult,
          imageResult,
          stockResult,
          attributesResult,
          totalTime,
          errors
        }
      };

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      return {
        refId,
        success: false,
        message: `Erro crítico ao importar produto ${refId}: ${error.message}`,
        data: {
          refId,
          totalTime,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Verificar existência de produtos em lote
   */
  async checkProductsExistence(refIds: string[]): Promise<Map<string, boolean>> {
    try {
      const placeholders = refIds.map(() => '?').join(',');
      const query = `
        SELECT ref_id FROM products_vtex 
        WHERE ref_id IN (${placeholders})
      `;
      
      const results = await executeQuery(query, refIds);
      const existingRefIds = new Set(results.map((row: any) => row.ref_id));
      
      const existenceMap = new Map<string, boolean>();
      refIds.forEach(refId => {
        existenceMap.set(refId, existingRefIds.has(refId));
      });
      
      return existenceMap;
    } catch (error) {
      console.error('Erro ao verificar existência de produtos:', error);
      return new Map();
    }
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.brandCache.clear();
    this.categoryCache.clear();
  }
}

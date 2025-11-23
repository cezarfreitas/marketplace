import { ProductImportModule } from './product-import';
import { BrandImportModule } from './brand-import';
import { CategoryImportModule } from './category-import';
import { SKUImportModule } from './sku-import';
import { ImageImportModule } from './image-import';
import { StockImportModule } from './stock-import';
import { ProductAttributesImportModule } from './product-attributes-import';
import { ProductAttributesVtexImportModule } from './product-attributes-vtex-import';
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
    attributesVtexResult?: any;
    totalTime: number;
    errors: string[];
  };
}

/**
 * Interface para configuração de importação rápida
 */
export interface FastBatchImportConfig {
  batchSize: number;
  batchId?: number | null;
  importImages?: boolean;
  importStock?: boolean;
  importAttributes?: boolean;
  importAttributesVtex?: boolean;
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
  private attributesVtexImporter: ProductAttributesVtexImportModule;
  
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
    this.attributesVtexImporter = new ProductAttributesVtexImportModule(baseUrl, headers);
  }

  /**
   * Importar múltiplos produtos em lote com processamento paralelo
   */
  async importMultipleProductsFast(
    refIds: string[], 
    config: FastBatchImportConfig,
    onProgress?: (current: number, total: number, currentItem?: string) => void
  ): Promise<FastBatchImportResult[]> {
    const startTime = Date.now();
    
    // Primeiro, contar total de SKUs para todos os produtos
    let totalSkus = 0;
    console.log('🔍 Contando SKUs totais...');
    
    for (const refId of refIds) {
      try {
        const productResult = await this.productImporter.importProductByRefId(refId, config.batchId || null);
        if (productResult.success && productResult.data?.product?.Id) {
          const skuResult = await this.skuImporter.importSkusByProductId(productResult.data.product.Id);
          if (skuResult.success && skuResult.data?.skus) {
            totalSkus += skuResult.data.skus.length;
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao contar SKUs para ${refId}:`, error);
      }
    }
    
    console.log(`📊 Total de SKUs encontrados: ${totalSkus}`);
    console.log(`🚀 INICIANDO IMPORTAÇÃO RÁPIDA PARA ${refIds.length} PRODUTOS`);
    console.log('============================================================\n');

    // Dividir em lotes para processamento otimizado
    const batchSize = Math.min(config.batchSize || 20, 20); // Aumentado para 20
    const batches = [];
    for (let i = 0; i < refIds.length; i += batchSize) {
      batches.push(refIds.slice(i, i + batchSize));
    }

    const results: FastBatchImportResult[] = [];

    // Processar cada lote com controle de concorrência
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} produtos)`);
      
      // Processar produtos do lote em paralelo para máxima velocidade
      const batchResults: FastBatchImportResult[] = [];
      
      // Processar até 5 produtos em paralelo por vez
      const parallelLimit = Math.min(5, batch.length);
      
      for (let i = 0; i < batch.length; i += parallelLimit) {
        const parallelBatch = batch.slice(i, i + parallelLimit);
        
        const parallelPromises = parallelBatch.map(async (refId, parallelIndex) => {
          const currentIndex = batchIndex * batchSize + i + parallelIndex;
          
          try {
            const result = await this.importProductByRefIdFast(refId, config, onProgress, currentIndex, refIds.length);
            return result;
          } catch (error: any) {
            console.error(`❌ Erro ao processar ${refId}:`, error.message);
            
            // Não atualizar progresso em caso de erro - apenas SKUs mostram progresso
            
            return {
              refId,
              success: false,
              message: error.message
            };
          }
        });
        
        // Aguardar processamento paralelo
        const parallelResults = await Promise.all(parallelPromises);
        batchResults.push(...parallelResults);
        
        // Pausa mínima entre lotes paralelos para evitar sobrecarga
        if (i + parallelLimit < batch.length) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      results.push(...batchResults);
      console.log(`✅ Lote ${batchIndex + 1} concluído`);
      
      // Pausa entre lotes para evitar sobrecarga do banco
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
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
    config: FastBatchImportConfig,
    onProgress?: (current: number, total: number, currentItem?: string) => void,
    currentIndex?: number,
    totalItems?: number
  ): Promise<FastBatchImportResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`📦 Importando produto: ${refId}`);


      // PASSO 1: Importar produto
      let productResult = null;
      try {
        productResult = await this.productImporter.importProductByRefId(refId, config.batchId || null);
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

      // PASSO 5: Importar imagens e estoque para cada SKU (otimizado)
      let imageResult = null;
      let stockResult = null;
      
      if (config.importImages || config.importStock) {
        const skus = skuResult?.data?.skus || [];
        
        if (skus.length > 0) {
          // Importar imagens apenas do primeiro SKU que tenha imagens disponíveis
          let imagesImported = false;
          let firstSkuWithImages: any = null;
          let totalImportedImages = 0;
          let totalUpdatedImages = 0;
          
          if (config.importImages) {
            // Tentar importar imagens do primeiro SKU que tenha imagens
            for (let i = 0; i < skus.length && !imagesImported; i++) {
              const sku = skus[i];
              try {
                const imgResult = await this.imageImporter.importImagesBySkuId(sku.Id);
                if (imgResult.success && imgResult.data && (imgResult.data.importedCount > 0 || imgResult.data.updatedCount > 0)) {
                  imagesImported = true;
                  firstSkuWithImages = sku;
                  totalImportedImages = imgResult.data.importedCount;
                  totalUpdatedImages = imgResult.data.updatedCount;
                  console.log(`✅ Imagens importadas do SKU ${sku.Id} (${sku.Name}) - ${totalImportedImages + totalUpdatedImages} imagens`);
                  break;
                }
              } catch (error) {
                // Continuar para o próximo SKU se houver erro
                continue;
              }
            }
            
            if (!imagesImported) {
              console.log(`⚠️ Nenhuma imagem encontrada para nenhum SKU do produto ${refId}`);
            }
          }

          // Processar SKUs em paralelo para máxima velocidade (apenas estoque)
          const skuPromises = skus.map(async (sku: any, i: number) => {
            // Atualizar progresso durante processamento de SKUs
            if (onProgress && currentIndex !== undefined && totalItems) {
              const progressMessage = `Processando SKU ${i + 1}/${skus.length} do produto ${refId}`;
              onProgress(currentIndex + (i / skus.length), totalItems, progressMessage);
            }
            
            const skuResults: any = {};
            
            // Processar apenas estoque para cada SKU (imagens já foram processadas acima)
            const stockResult = await Promise.resolve(
              config.importStock ? this.stockImporter.importStockBySkuId(sku.Id) : Promise.resolve({ success: false })
            );
            
            // Processar resultado do estoque
            if (config.importStock && stockResult.success && 'data' in stockResult) {
              const stockData = stockResult.data as { importedCount?: number; updatedCount?: number };
              skuResults.stockImported = stockData?.importedCount || 0;
              skuResults.stockUpdated = stockData?.updatedCount || 0;
            }
            
            return { sku, results: skuResults };
          });
          
          // Aguardar processamento paralelo de todos os SKUs
          const skuResults = await Promise.all(skuPromises);
          
          // Consolidar resultados
          let totalImportedStock = 0;
          let totalUpdatedStock = 0;
          
          skuResults.forEach(({ results }) => {
            totalImportedStock += results.stockImported || 0;
            totalUpdatedStock += results.stockUpdated || 0;
          });
          
          imageResult = {
            success: true,
            data: {
              importedCount: totalImportedImages,
              updatedCount: totalUpdatedImages
            }
          };
          
          stockResult = {
            success: true,
            data: {
              importedCount: totalImportedStock,
              updatedCount: totalUpdatedStock
            }
          };
        }
      }

      // PASSO 6: Importar atributos do produto (módulo antigo - desabilitado)
      let attributesResult = null;
      if (false && config.importAttributes && product?.Id) {
        try {
          console.log(`📋 Importando atributos do produto ${product!.Id}...`);
          attributesResult = await this.attributesImporter.importProductAttributes(product!.Id);
          
          if (attributesResult.success) {
            console.log(`✅ Atributos: ${attributesResult.attributesImported} importados`);
          } else {
            console.log(`❌ Erro ao importar atributos: ${attributesResult.message}`);
            errors.push(`Atributos: ${attributesResult.message}`);
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar atributos do produto ${product!.Id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // PASSO 6B: Importar atributos VTEX do produto
      let attributesVtexResult = null;
      if (config.importAttributesVtex && product?.Id) {
        try {
          console.log(`📋 Importando atributos VTEX do produto ${product.Id}...`);
          attributesVtexResult = await this.attributesVtexImporter.importAttributesByProductId(product.Id);
          
          if (attributesVtexResult.success) {
            const importedCount = attributesVtexResult.data?.importedCount || 0;
            const updatedCount = attributesVtexResult.data?.updatedCount || 0;
            console.log(`✅ Atributos VTEX: ${importedCount} importados, ${updatedCount} atualizados`);
          } else {
            console.log(`❌ Erro ao importar atributos VTEX: ${attributesVtexResult.message}`);
            errors.push(`Atributos VTEX: ${attributesVtexResult.message}`);
          }
        } catch (error: any) {
          const errorMsg = `Erro ao importar atributos VTEX do produto ${product.Id}: ${error.message}`;
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
          attributesVtexResult,
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
        SELECT ref_produto FROM products_vtex 
        WHERE ref_produto IN (${placeholders})
      `;
      
      const results = await executeQuery(query, refIds);
      const existingRefIds = new Set(results.map((row: any) => row.ref_produto));
      
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

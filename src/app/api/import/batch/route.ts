import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { createVtexServiceFromDB } from '@/lib/vtex-service';
import { executeQuery } from '@/lib/db-ultra-simple';

// Função auxiliar para garantir que valores undefined sejam convertidos para null
function sanitizeParams(params: any[]): any[] {
  return params.map(param => param === undefined ? null : param);
}

interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  current: string;
  errors: string[];
}

// Cache para armazenar progresso da importação
const importProgress = new Map<string, ImportProgress>();

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { refIds, batchId } = body;

    if (!refIds || !Array.isArray(refIds) || refIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de RefIds é obrigatória'
      }, { status: 400 });
    }

    const progressId = batchId || `import_${Date.now()}`;
    
    // Criar instância do serviço VTEX com configurações do banco
    const vtexService = await createVtexServiceFromDB();
    
    // Inicializar progresso
    importProgress.set(progressId, {
      total: refIds.length,
      processed: 0,
      success: 0,
      failed: 0,
      current: '',
      errors: []
    });

    // Processar em lote (não aguardar)
    processBatchImport(refIds, progressId, vtexService);

    return NextResponse.json({
      success: true,
      message: 'Importação iniciada',
      data: { progressId }
    });

  } catch (error: any) {
    console.error('❌ Erro na importação em lote:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progressId');

    if (!progressId) {
      return NextResponse.json({
        success: false,
        message: 'ID de progresso é obrigatório'
      }, { status: 400 });
    }

    const progress = importProgress.get(progressId);
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        message: 'Progresso não encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar progresso:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

async function processBatchImport(refIds: string[], progressId: string, vtexService: any) {
  const progress = importProgress.get(progressId);
  if (!progress) return;

  console.log(`🚀 Iniciando importação em lote: ${refIds.length} produtos`);
  
  // Cache para marcas e categorias já processadas
  const brandCache = new Map<number, any>();
  const categoryCache = new Map<number, any>();

  // Processar em lotes de 15 para otimizar a importação
  const batchSize = 15;
  const batches = [];
  
  for (let i = 0; i < refIds.length; i += batchSize) {
    batches.push(refIds.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Processar lote em paralelo
    const promises = batch.map(async (refId) => {
      try {
        progress.current = `Processando ${refId}...`;
        
        // 1. Buscar produto da VTEX
        console.log(`📦 1. Buscando produto da VTEX...`);
        const product = await vtexService.getProductByRefId(refId);
        
        // Validar produto antes de inserir
        if (!product.Id || product.Id === null || product.Id === undefined) {
          throw new Error(`Produto RefId ${refId} não possui vtex_id válido (Id: ${product.Id})`);
        }

        // 2. Inserir produto primeiro (sem dependências)
        console.log(`📦 2. Inserindo produto...`);
        await executeQuery(
          `INSERT INTO products (vtex_id, name, description, ref_id, is_active, is_visible, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
          sanitizeParams([
            product.Id,
            product.Name,
            product.Description,
            product.RefId,
            product.IsActive,
            product.IsVisible
          ])
        );

        // Buscar ID interno do produto inserido
        const [productRow] = await executeQuery('SELECT id FROM products WHERE vtex_id = ?', [product.Id]) as any[];
        const internalProductId = productRow[0]?.id;

        if (!internalProductId) {
          throw new Error(`Não foi possível obter ID interno do produto ${product.Id}`);
        }

        // 3. Buscar e inserir SKUs
        console.log(`📋 3. Buscando e inserindo SKUs...`);
        const skus = await vtexService.getProductSKUs(product.Id);
        console.log(`📊 Encontrados ${skus.length} SKUs`);
        
        for (const sku of skus) {
          // Validar SKU antes de inserir
          if (!sku.Id || sku.Id === null || sku.Id === undefined) {
            console.log(`⚠️ SKU inválido ignorado (Id: ${sku.Id})`);
            continue;
          }
          
          await executeQuery(
            `INSERT INTO skus (vtex_id, product_id, name_complete, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name_complete = VALUES(name_complete), is_active = VALUES(is_active), updated_at = NOW()`,
            sanitizeParams([
              sku.Id,
              internalProductId,
              sku.Name || sku.NameComplete || null,
              sku.IsActive
            ])
          );
        }
        
        // 4. Buscar e inserir imagens em todos os SKUs até encontrar
        console.log(`🖼️ 4. Buscando imagens em ${skus.length} SKUs...`);
        let imagesFound = false;
        let skuWithImages: any = null;
        
        if (skus.length > 0) {
          // Tentar buscar imagens em cada SKU até encontrar
          for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            if (!sku.Id) continue;
            
            console.log(`🔍 Verificando SKU ${i + 1}/${skus.length}: ${sku.Id} (${sku.Name || sku.NameComplete})`);
            
            try {
              const images = await vtexService.getSKUImages(sku.Id);
              console.log(`📊 SKU ${sku.Id}: ${images.length} imagens encontradas`);
              
              if (images.length > 0) {
                console.log(`✅ Imagens encontradas no SKU ${sku.Id}! Parando busca.`);
                skuWithImages = sku;
                imagesFound = true;
                
                // Buscar ID interno do SKU
                const [skuRow] = await executeQuery('SELECT id FROM skus WHERE vtex_id = ?', [sku.Id]) as any[];
                const internalSkuId = skuRow[0]?.id;
                
                if (!internalSkuId) {
                  console.log(`⚠️ SKU interno não encontrado para vtex_id: ${sku.Id}`);
                } else {
                  for (const image of images) {
                    // Usar FileLocation se Url estiver null, senão usar Url
                    const imageUrl = image.Url || image.FileLocation;
                    
                    console.log(`🖼️ Processando imagem:`, {
                      Url: image.Url,
                      FileLocation: image.FileLocation,
                      FinalUrl: imageUrl,
                      Name: image.Name,
                      Id: image.Id,
                      IsMain: image.IsMain,
                      InternalSkuId: internalSkuId
                    });
                    
                    if (imageUrl) {
                      // Construir URL completa se FileLocation não tiver protocolo
                      const fullImageUrl = imageUrl.startsWith('http') 
                        ? imageUrl 
                        : `https://${imageUrl}`;
                      
                      await executeQuery(
                        `INSERT INTO images (vtex_id, archive_id, sku_id, name, is_main, text, label, url, file_location, position, contexto, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                         ON DUPLICATE KEY UPDATE 
                         url = VALUES(url), file_location = VALUES(file_location), updated_at = NOW()`,
                        sanitizeParams([
                          image.Id,
                          image.ArchiveId,
                          internalSkuId, // Usar ID interno do SKU
                          image.Name || null,
                          image.IsMain ? 1 : 0,
                          image.Text || null,
                          image.Label || null,
                          image.Url,
                          image.FileLocation,
                          image.Position || 0,
                          'imported_from_vtex'
                        ])
                      );
                      console.log(`✅ Imagem inserida: ${fullImageUrl}`);
                    } else {
                      console.log(`⚠️ Imagem sem URL válida:`, image);
                    }
                  }
                }
                break; // Parar assim que encontrar imagens
              } else {
                console.log(`❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
              console.log(`⚠️ Erro ao buscar imagens do SKU ${sku.Id}:`, errorMessage);
              // Continuar para o próximo SKU em caso de erro
            }
          }
          
          if (!imagesFound) {
            console.log(`❌ Nenhuma imagem encontrada em nenhum dos ${skus.length} SKUs`);
          }
        } else {
          console.log(`⚠️ Nenhum SKU encontrado para o produto ${product.Id}`);
        }

        // 5. Importar estoque de todos os SKUs
        console.log(`📦 5. Importando estoque de ${skus.length} SKUs...`);
        const stockResults: any[] = [];
        let stockSuccessCount = 0;
        let stockErrorCount = 0;
        
        for (const sku of skus) {
          if (!sku.Id) continue;
          
          console.log(`🔍 Importando estoque do SKU ${sku.Id}...`);
          
          try {
            // Buscar dados de estoque da API VTEX
            const stockApiUrl = `https://${vtexService.config.accountName}.${vtexService.config.environment}.com.br/api/logistics/pvt/inventory/skus/${sku.Id}`;
            
            const stockResponse = await fetch(stockApiUrl, {
              method: 'GET',
              headers: {
                'X-VTEX-API-AppKey': vtexService.config.appKey,
                'X-VTEX-API-AppToken': vtexService.config.appToken,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            
            if (stockResponse.ok) {
              const stockData = await stockResponse.json();
              console.log(`📊 SKU ${sku.Id}: ${stockData.balance?.length || 0} warehouses encontrados`);
              
              // Buscar ID interno do SKU
              const [skuRow] = await executeQuery('SELECT id FROM skus WHERE vtex_id = ?', [sku.Id]) as any[];
              const skuInternalId = skuRow[0]?.id;
              
              if (skuInternalId && stockData.balance && Array.isArray(stockData.balance)) {
                // Inserir dados de estoque no banco
                for (const balance of stockData.balance) {
                  try {
                    await executeQuery(`
                      INSERT INTO stock (
                        sku_id, vtex_sku_id, warehouse_id, warehouse_name,
                        total_quantity, reserved_quantity, has_unlimited_quantity,
                        time_to_refill, date_of_supply_utc, lead_time
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE
                        total_quantity = VALUES(total_quantity),
                        reserved_quantity = VALUES(reserved_quantity),
                        has_unlimited_quantity = VALUES(has_unlimited_quantity),
                        time_to_refill = VALUES(time_to_refill),
                        date_of_supply_utc = VALUES(date_of_supply_utc),
                        lead_time = VALUES(lead_time),
                        updated_at = CURRENT_TIMESTAMP
                    `, sanitizeParams([
                      skuInternalId,
                      sku.Id,
                      balance.warehouseId,
                      balance.warehouseName,
                      balance.totalQuantity || 0,
                      balance.reservedQuantity || 0,
                      balance.hasUnlimitedQuantity || false,
                      balance.timeToRefill,
                      balance.dateOfSupplyUtc ? new Date(balance.dateOfSupplyUtc) : null,
                      balance.leadTime
                    ]));
                    
                    console.log(`✅ Estoque inserido: ${balance.warehouseName} - Qtd: ${balance.totalQuantity}`);
                    stockResults.push({
                      skuId: sku.Id,
                      warehouseId: balance.warehouseId,
                      warehouseName: balance.warehouseName,
                      totalQuantity: balance.totalQuantity,
                      reservedQuantity: balance.reservedQuantity
                    });
                    
                  } catch (insertError) {
                    console.error(`❌ Erro ao inserir estoque para warehouse ${balance.warehouseId}:`, (insertError as Error).message);
                    stockErrorCount++;
                  }
                }
                
                stockSuccessCount++;
              }
            } else {
              console.log(`⚠️ Erro na API de estoque para SKU ${sku.Id}: ${stockResponse.status}`);
              stockErrorCount++;
            }
          } catch (error) {
            console.error(`❌ Erro ao importar estoque do SKU ${sku.Id}:`, (error as Error).message);
            stockErrorCount++;
          }
        }
        
        console.log(`📊 Resumo do estoque: ${stockSuccessCount} SKUs processados, ${stockErrorCount} erros`);

        // 6. Buscar e inserir marca (com cache)
        console.log(`🏷️ 6. Buscando e inserindo marca...`);
        let brand = brandCache.get(product.BrandId);
        
        if (!brand) {
          brand = await vtexService.getBrand(product.BrandId).catch(() => null);
          if (brand) {
            brandCache.set(product.BrandId, brand);
          }
        }
        
        if (brand && brand.id && brand.id !== null && brand.id !== undefined) {
          await executeQuery(
            `INSERT INTO brands (vtex_id, name, is_active, title, meta_tag_description, image_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), updated_at = NOW()`,
            sanitizeParams([
              brand.id,
              brand.name,
              brand.isActive,
              brand.title || null,
              brand.metaTagDescription || null,
              brand.imageUrl || null
            ])
          );
          
          // Atualizar produto com brand_id
          const [brandRow] = await executeQuery('SELECT id FROM brands WHERE vtex_id = ?', [brand.id]) as any[];
          const brandId = brandRow[0]?.id;
          
          if (brandId) {
            await executeQuery(
              'UPDATE products SET brand_id = ? WHERE id = ?',
              [brandId, internalProductId]
            );
            console.log(`✅ Marca inserida e produto atualizado com brand_id: ${brandId}`);
          }
        } else {
          console.log(`⚠️ Marca não encontrada ou inválida para BrandId: ${product.BrandId}`);
        }

        // 7. Buscar e inserir categoria (com cache)
        console.log(`📂 7. Buscando e inserindo categoria...`);
        let category = categoryCache.get(product.CategoryId);
        
        if (!category) {
          category = await vtexService.getCategory(product.CategoryId).catch(() => null);
          if (category) {
            categoryCache.set(product.CategoryId, category);
          }
        }
        
        if (category && category.Id && category.Id !== null && category.Id !== undefined) {
          await executeQuery(
            `INSERT INTO categories (vtex_id, name, is_active, title, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), updated_at = NOW()`,
            sanitizeParams([
              category.Id,
              category.Name,
              category.IsActive,
              category.Title || null
            ])
          );
          
          // Atualizar produto com category_id
          const [categoryRow] = await executeQuery('SELECT id FROM categories WHERE vtex_id = ?', [category.Id]) as any[];
          const categoryId = categoryRow[0]?.id;
          
          if (categoryId) {
            await executeQuery(
              'UPDATE products SET category_id = ? WHERE id = ?',
              [categoryId, internalProductId]
            );
            console.log(`✅ Categoria inserida e produto atualizado com category_id: ${categoryId}`);
          }
        } else {
          console.log(`⚠️ Categoria não encontrada ou inválida para CategoryId: ${product.CategoryId}`);
        }

        progress.success++;
        console.log(`✅ Produto ${refId} importado com sucesso`);

      } catch (error: any) {
        progress.failed++;
        const errorMsg = `Erro ao importar ${refId}: ${error.message}`;
        progress.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        console.error(`❌ Stack trace:`, error.stack);
      } finally {
        progress.processed++;
      }
    });

    // Aguardar lote atual terminar
    await Promise.all(promises);
    
    // Pausa otimizada entre lotes para não sobrecarregar a API
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  progress.current = 'Importação concluída';
  console.log(`🎉 Importação em lote concluída: ${progress.success} sucessos, ${progress.failed} falhas`);

  // Limpar progresso após 5 minutos
  setTimeout(() => {
    importProgress.delete(progressId);
  }, 5 * 60 * 1000);
}

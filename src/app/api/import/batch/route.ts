import { NextRequest, NextResponse } from 'next/server';
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

  // Processar em lotes de 5 para não sobrecarregar a API da VTEX
  const batchSize = 5;
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
        const [productRow] = await executeQuery('SELECT id FROM products WHERE vtex_id = ?', [product.Id]);
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
        
        // 4. Buscar e inserir imagens apenas do primeiro SKU
        console.log(`🖼️ 4. Buscando e inserindo imagens do primeiro SKU...`);
        if (skus.length > 0) {
          const firstSku = skus[0];
          if (firstSku.Id) {
            try {
              console.log(`🔍 Buscando imagens para o primeiro SKU ${firstSku.Id}...`);
              const images = await vtexService.getSKUImages(firstSku.Id);
              console.log(`📊 Primeiro SKU ${firstSku.Id} retornou ${images.length} imagens`);
              
              // Buscar ID interno do SKU
              const [skuRow] = await executeQuery('SELECT id FROM skus WHERE vtex_id = ?', [firstSku.Id]);
              const internalSkuId = skuRow[0]?.id;
              
              if (!internalSkuId) {
                console.log(`⚠️ SKU interno não encontrado para vtex_id: ${firstSku.Id}`);
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
            } catch (error) {
              console.log(`❌ Erro ao buscar imagens do primeiro SKU ${firstSku.Id}:`, error.message);
            }
          }
        } else {
          console.log(`⚠️ Nenhum SKU encontrado para o produto ${product.Id}`);
        }

        // 5. Buscar e inserir marca
        console.log(`🏷️ 5. Buscando e inserindo marca...`);
        const brand = await vtexService.getBrand(product.BrandId).catch(() => null);
        
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
          const [brandRow] = await executeQuery('SELECT id FROM brands WHERE vtex_id = ?', [brand.id]);
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

        // 6. Buscar e inserir categoria
        console.log(`📂 6. Buscando e inserindo categoria...`);
        const category = await vtexService.getCategory(product.CategoryId).catch(() => null);
        
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
          const [categoryRow] = await executeQuery('SELECT id FROM categories WHERE vtex_id = ?', [category.Id]);
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
    
    // Pequena pausa entre lotes para não sobrecarregar a API
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  progress.current = 'Importação concluída';
  console.log(`🎉 Importação em lote concluída: ${progress.success} sucessos, ${progress.failed} falhas`);

  // Limpar progresso após 5 minutos
  setTimeout(() => {
    importProgress.delete(progressId);
  }, 5 * 60 * 1000);
}

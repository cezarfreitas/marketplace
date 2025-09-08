import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';
import { executeQuery } from '@/lib/db-ultra-simple';

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
    processBatchImport(refIds, progressId);

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

async function processBatchImport(refIds: string[], progressId: string) {
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
        
        // Buscar produto da VTEX
        const product = await vtexService.getProductByRefId(refId);
        
        // Buscar marca e categoria em paralelo
        const [brand, category] = await Promise.all([
          vtexService.getBrand(product.BrandId).catch(() => null),
          vtexService.getCategory(product.CategoryId).catch(() => null)
        ]);

        // Inserir marca se não existir
        if (brand) {
          await executeQuery(
            `INSERT INTO brands (vtex_id, name, is_active, title, meta_tag_description, image_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), updated_at = NOW()`,
            [
              brand.id,
              brand.name,
              brand.isActive,
              brand.title || null,
              brand.metaTagDescription || null,
              brand.imageUrl || null
            ]
          );
        }

        // Inserir categoria se não existir
        if (category) {
          await executeQuery(
            `INSERT INTO categories (vtex_id, name, is_active, title, meta_tag_description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), updated_at = NOW()`,
            [
              category.id,
              category.name,
              category.isActive,
              category.title || null,
              category.metaTagDescription || null
            ]
          );
        }

        // Inserir produto
        await executeQuery(
          `INSERT INTO products (vtex_id, name, description, brand_id, category_id, ref_id, is_active, is_visible, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), description = VALUES(description), brand_id = VALUES(brand_id), 
           category_id = VALUES(category_id), is_active = VALUES(is_active), is_visible = VALUES(is_visible), updated_at = NOW()`,
          [
            product.Id,
            product.Name,
            product.Description,
            product.BrandId,
            product.CategoryId,
            product.RefId,
            product.IsActive,
            product.IsVisible
          ]
        );

        // Buscar e inserir SKUs
        const skus = await vtexService.getProductSkus(product.Id);
        for (const sku of skus) {
          await executeQuery(
            `INSERT INTO skus (vtex_id, product_id, name, ref_id, is_active, is_visible, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             name = VALUES(name), is_active = VALUES(is_active), is_visible = VALUES(is_visible), updated_at = NOW()`,
            [
              sku.Id,
              product.Id,
              sku.Name,
              sku.RefId,
              sku.IsActive,
              sku.IsVisible
            ]
          );
        }

        progress.success++;
        console.log(`✅ Produto ${refId} importado com sucesso`);

      } catch (error: any) {
        progress.failed++;
        const errorMsg = `Erro ao importar ${refId}: ${error.message}`;
        progress.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
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

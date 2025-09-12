import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API de produtos chamada');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const offset = (page - 1) * limit;

    // Construir condições de busca
    let whereClause = '';
    const searchParams_array: any[] = [];
    const conditions: string[] = [];
    
    // Busca por texto
    if (search) {
      conditions.push(`(p.name LIKE ? OR p.description LIKE ? OR p.title LIKE ? OR p.ref_id LIKE ? OR b.name LIKE ? OR c.name LIKE ?)`);
      const searchTerm = `%${search}%`;
      searchParams_array.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filtros básicos apenas
    const brand_id = searchParams.getAll('brand_id');
    const category_id = searchParams.getAll('category_id');
    const is_active = searchParams.get('is_active');
    const is_visible = searchParams.get('is_visible');
    const stock_operator = searchParams.get('stock_operator');
    const stock_value = searchParams.get('stock_value');

    if (brand_id && brand_id.length > 0) {
      // Filtrar valores vazios
      const validBrandIds = brand_id.filter(id => id && id.trim() !== '');
      if (validBrandIds.length > 0) {
        const placeholders = validBrandIds.map(() => '?').join(',');
        conditions.push(`p.brand_id IN (${placeholders})`);
        searchParams_array.push(...validBrandIds);
      }
    }

    if (category_id && category_id.length > 0) {
      // Filtrar valores vazios
      const validCategoryIds = category_id.filter(id => id && id.trim() !== '');
      if (validCategoryIds.length > 0) {
        const placeholders = validCategoryIds.map(() => '?').join(',');
        conditions.push(`p.category_id IN (${placeholders})`);
        searchParams_array.push(...validCategoryIds);
      }
    }


    // Filtros complexos removidos para simplificar

    if (is_active) {
      if (is_active === 'true') {
        conditions.push(`p.is_active = 1`);
      } else if (is_active === 'false') {
        conditions.push(`p.is_active = 0`);
      }
    }

    if (is_visible) {
      if (is_visible === 'true') {
        conditions.push(`p.is_visible = 1`);
      } else if (is_visible === 'false') {
        conditions.push(`p.is_visible = 0`);
      }
    }

    // Filtro para análise de imagens
    const has_image_analysis = searchParams.get('has_image_analysis');
    if (has_image_analysis) {
      if (has_image_analysis === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id)`);
      } else if (has_image_analysis === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id)`);
      }
    }

    // Filtro para descrição do marketplace
    const has_marketplace_description = searchParams.get('has_marketplace_description');
    if (has_marketplace_description) {
      if (has_marketplace_description === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id)`);
      } else if (has_marketplace_description === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id)`);
      }
    }

    // Filtro para referência Anymarket
    const has_anymarket_ref_id = searchParams.get('has_anymarket_ref_id');
    if (has_anymarket_ref_id) {
      if (has_anymarket_ref_id === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id)`);
      } else if (has_anymarket_ref_id === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id)`);
      }
    }

    // Filtro para sincronização Anymarket
    const has_anymarket_sync_log = searchParams.get('has_anymarket_sync_log');
    if (has_anymarket_sync_log) {
      if (has_anymarket_sync_log === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id)`);
      } else if (has_anymarket_sync_log === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id)`);
      }
    }

    // Filtro para crop de imagens
    const has_crop_processed = searchParams.get('has_crop_processed');
    if (has_crop_processed) {
      if (has_crop_processed === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')`);
      } else if (has_crop_processed === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')`);
      }
    }

    // Filtro para estoque
    if (stock_operator && stock_value !== null && stock_value !== '') {
      const stockNum = parseFloat(stock_value);
      if (!isNaN(stockNum)) {
        const stockCondition = `
          (SELECT COALESCE(SUM(st.total_quantity), 0) 
           FROM skus_vtex s 
           LEFT JOIN stock_vtex st ON s.id = st.sku_id 
           WHERE s.product_id = p.id) ${stock_operator} ?
        `;
        conditions.push(stockCondition);
        searchParams_array.push(stockNum);
      }
    }

    // Filtro para status de otimização
    const optimization_status = searchParams.get('optimization_status');
    if (optimization_status) {
      switch (optimization_status) {
        case 'none':
          // Produtos sem nenhuma otimização
          conditions.push(`(
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
            NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
          )`);
          break;
          
        case 'partial':
          // Produtos que têm algumas otimizações, mas não todas
          conditions.push(`(
            (EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND 
             NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id)) OR
            (EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND 
             NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id)) OR
            (EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND 
             EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
             NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id)) OR
            (EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND 
             EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
             EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) AND
             NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id)) OR
            (EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed') AND
             NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
             NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id))
          )`);
          break;
          
        case 'complete':
          // Produtos totalmente otimizados (todas as otimizações)
          conditions.push(`(
            EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
            EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
            EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) AND
            EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id) AND
            EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
          )`);
          break;
          
        case 'analysis_only':
          // Produtos que têm apenas análise de imagens
          conditions.push(`(
            EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
            NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
          )`);
          break;
          
        case 'marketplace_only':
          // Produtos que têm apenas descrição do marketplace
          conditions.push(`(
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
            EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id) AND
            NOT EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
          )`);
          break;
          
        case 'anymarket_only':
          // Produtos que têm apenas integração com Anymarket
          conditions.push(`(
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id) AND
            NOT EXISTS (SELECT 1 FROM marketplace m WHERE m.product_id = p.id) AND
            (EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id) OR
             EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id)) AND
            NOT EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
          )`);
          break;
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Validar campos de ordenação
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'vtex_id', 'brand_name', 'category_name', 'total_stock'];
    const validSortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Query básica para produtos
    let productsQuery = '';
    
    if (validSortField === 'total_stock') {
      // Query especial para ordenação por estoque
      productsQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          c.name as category_name,
          c.vtex_id as category_vtex_id,
          0 as sku_count,
          COALESCE(stock.total_stock, 0) as total_stock
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.brand_id = b.vtex_id
        LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
        LEFT JOIN (
          SELECT 
            s.product_id,
            SUM(COALESCE(st.total_quantity, 0)) as total_stock
          FROM skus_vtex s
          LEFT JOIN stock_vtex st ON s.id = st.sku_id
          GROUP BY s.product_id
        ) stock ON p.id = stock.product_id
        ${whereClause}
        ORDER BY COALESCE(stock.total_stock, 0) ${validOrder}
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Query padrão para outras ordenações
      productsQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          c.name as category_name,
          c.vtex_id as category_vtex_id,
          0 as sku_count,
          0 as total_stock
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.brand_id = b.vtex_id
        LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
        ${whereClause}
        ORDER BY p.${validSortField} ${validOrder}
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    console.log('📝 Executando query de produtos...');
    console.log('🔍 Query:', productsQuery.substring(0, 200) + '...');
    console.log('📊 Parâmetros:', searchParams_array);
    
    const products = await executeQuery(productsQuery, searchParams_array);
    console.log('✅ Query executada com sucesso!');

    // Adicionar contagem de SKUs e imagens para cada produto
    for (const product of products) {
      try {
        // Contar SKUs
        const skuCountQuery = `
          SELECT COUNT(*) as sku_count
          FROM skus_vtex
          WHERE product_id = ?
        `;
        const skuCountResult = await executeQuery(skuCountQuery, [product.id]);
        product.sku_count = skuCountResult[0]?.sku_count || 0;

        // Contar imagens (usando os IDs dos SKUs do produto)
        const imageCountQuery = `
          SELECT COUNT(*) as image_count
          FROM images_vtex
          WHERE sku_id IN (
            SELECT id FROM skus_vtex WHERE product_id = ?
          )
        `;
        const imageCountResult = await executeQuery(imageCountQuery, [product.id]);
        product.image_count = imageCountResult[0]?.image_count || 0;

        // Contar estoque (usando os IDs dos SKUs do produto) - apenas se não foi calculado na query principal
        if (validSortField !== 'total_stock') {
          const stockCountQuery = `
            SELECT COALESCE(SUM(st.total_quantity), 0) as total_stock
            FROM skus_vtex s
            LEFT JOIN stock_vtex st ON s.id = st.sku_id
            WHERE s.product_id = ?
          `;
          const stockCountResult = await executeQuery(stockCountQuery, [product.id]);
          product.total_stock = stockCountResult[0]?.total_stock || 0;
        }

        // Buscar imagem principal do produto
        const imageQuery = `
          SELECT file_location, url
          FROM images_vtex
          WHERE sku_id IN (
            SELECT id FROM skus_vtex WHERE product_id = ?
          ) AND is_main = 1
          LIMIT 1
        `;
        const imageResult = await executeQuery(imageQuery, [product.id]);
        if (imageResult && imageResult.length > 0) {
          product.main_image = imageResult[0].file_location || imageResult[0].url;
        } else {
          // Se não encontrar imagem principal, buscar qualquer imagem
          const anyImageQuery = `
            SELECT file_location, url
            FROM images_vtex
            WHERE sku_id IN (
              SELECT id FROM skus_vtex WHERE product_id = ?
            )
            LIMIT 1
          `;
          const anyImageResult = await executeQuery(anyImageQuery, [product.id]);
          if (anyImageResult && anyImageResult.length > 0) {
            product.main_image = anyImageResult[0].file_location || anyImageResult[0].url;
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao contar SKUs/imagens/estoque para produto ${product.id}:`, error);
        product.sku_count = 0;
        product.image_count = 0;
        product.total_stock = 0;
      }
    }

    // Query para contar total - simplificada
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.brand_id = b.vtex_id
      LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, searchParams_array);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        products,
        total,
        totalPages,
        currentPage: page,
        limit,
        search
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produtos'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de IDs de produtos é obrigatória'
      }, { status: 400 });
    }

    console.log('🗑️ Deletando múltiplos produtos:', productIds);

    // Verificar se todos os produtos existem
    const placeholders = productIds.map(() => '?').join(',');
    const existingProducts = await executeQuery(
      `SELECT id, name FROM products_vtex WHERE id IN (${placeholders})`,
      productIds
    );

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Um ou mais produtos não foram encontrados'
      }, { status: 404 });
    }

    console.log(`📊 ${existingProducts.length} produtos encontrados para deletar`);

    // Deletar apenas os produtos (simplificado)
    try {
      // Deletar os produtos
      console.log('🗑️ Deletando produtos...');
      await executeQuery(
        `DELETE FROM products_vtex WHERE id IN (${placeholders})`,
        productIds
      );

      console.log(`✅ ${existingProducts.length} produtos deletados com sucesso`);

      return NextResponse.json({
        success: true,
        message: `${existingProducts.length} produtos deletados com sucesso`,
        deletedProducts: existingProducts.map(p => p.name)
      });

    } catch (deleteError: any) {
      console.error('❌ Erro durante a deleção:', deleteError);
      throw deleteError;
    }

  } catch (error: any) {
    console.error('❌ Erro ao deletar produtos:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar produtos',
      error: error.message
    }, { status: 500 });
  }
}

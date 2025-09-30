import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { checkBuildEnvironment } from '@/lib/build-check';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    // Verificar rate limit (200 requisições por minuto)
    const rateLimitCheck = checkRateLimit(request);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit excedido',
          message: 'Máximo de 200 requisições por minuto. Aguarde antes de tentar novamente.',
          retryAfter: 60
        },
        { 
          status: 429,
          headers: {
            ...rateLimitCheck.headers,
            'Retry-After': '60'
          }
        }
      );
    }

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
      conditions.push(`(p.name LIKE ? OR p.description LIKE ? OR p.title LIKE ? OR p.ref_produto LIKE ? OR b.name LIKE ? OR c.name LIKE ?)`);
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
        conditions.push(`p.id_brand_vtex IN (${placeholders})`);
        searchParams_array.push(...validBrandIds);
      }
    }

    if (category_id && category_id.length > 0) {
      // Filtrar valores vazios
      const validCategoryIds = category_id.filter(id => id && id.trim() !== '');
      if (validCategoryIds.length > 0) {
        const placeholders = validCategoryIds.map(() => '?').join(',');
        conditions.push(`p.id_category_vtex IN (${placeholders})`);
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
        conditions.push(`EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex)`);
      } else if (has_image_analysis === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex)`);
      }
    }

    // Filtro para descrição do marketplace (removido - tabela não existe)
    // const has_marketplace_description = searchParams.get('has_marketplace_description');

    // Filtro para referência Anymarket
    const has_anymarket_ref_id = searchParams.get('has_anymarket_ref_id');
    if (has_anymarket_ref_id) {
      if (has_anymarket_ref_id === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto)`);
      } else if (has_anymarket_ref_id === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto)`);
      }
    }

    // Filtro para sincronização Anymarket
    const has_anymarket_sync_log = searchParams.get('has_anymarket_sync_log');
    if (has_anymarket_sync_log) {
    if (has_anymarket_sync_log === 'true') {
      conditions.push(`EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL)`);
    } else if (has_anymarket_sync_log === 'false') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL)`);
    }
    }

    // Filtro para crop de imagens
    const has_crop_processed = searchParams.get('has_crop_processed');
    if (has_crop_processed) {
      if (has_crop_processed === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')`);
      } else if (has_crop_processed === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')`);
      }
    }

    // Filtro para estoque
    if (stock_operator && stock_value !== null && stock_value !== '') {
      const stockNum = parseFloat(stock_value);
      if (!isNaN(stockNum)) {
        const stockCondition = `
          (SELECT COALESCE(SUM(st.total_quantity), 0) 
           FROM skus_vtex s 
           LEFT JOIN stock_vtex st ON s.id_sku_vtex = st.id_sku_vtex 
           WHERE s.id_produto_vtex = p.id_produto_vtex) ${stock_operator} ?
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
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')
          )`);
          break;
          
        case 'partial':
          // Produtos que têm algumas otimizações, mas não todas
          conditions.push(`(
            (EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND 
             NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL)) OR
            (NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND 
             EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL)) OR
            (EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop') AND
             NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex))
          )`);
          break;
          
        case 'complete':
          // Produtos totalmente otimizados (todas as otimizações)
          conditions.push(`(
            EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND
            EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL) AND
            EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')
          )`);
          break;
          
        case 'analysis_only':
          // Produtos que têm apenas análise de imagens
          conditions.push(`(
            EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')
          )`);
          break;
          
        case 'marketplace_only':
          // Produtos que têm apenas descrição do marketplace
          conditions.push(`(
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND
            NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')
          )`);
          break;
          
        case 'anymarket_only':
          // Produtos que têm apenas integração com Anymarket
          conditions.push(`(
            NOT EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto_vtex = p.id_produto_vtex) AND
            EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_produto_vtex = p.ref_produto AND a.id_produto_any IS NOT NULL) AND
            NOT EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.id_produto_vtex = p.id_produto_vtex AND asl.sync_type = 'crop')
          )`);
          break;
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Validar campos de ordenação
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'id_produto_vtex', 'brand_name', 'category_name', 'total_stock'];
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
          c.id_category_vtex as category_vtex_id,
          a.id_produto_any as anymarket_id,
          asl_success.last_sync_date as anymarket_enviado_any,
          asl_crop.last_crop_date as anymarket_imagem_cropada,
          t.title as optimized_title,
          0 as sku_count,
          COALESCE(stock.total_stock, 0) as total_stock,
          CASE WHEN ai.id_produto_vtex IS NOT NULL THEN 1 ELSE 0 END as has_image_analysis,
          CASE WHEN t.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_optimized_title,
          CASE WHEN d.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_generated_description,
          CASE WHEN rc.produto_id IS NOT NULL THEN 1 ELSE 0 END as has_generated_characteristics,
          CASE WHEN asl.product_id IS NOT NULL THEN 1 ELSE 0 END as has_anymarket_sync
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
        LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
        LEFT JOIN (
          SELECT DISTINCT ref_produto_vtex, id_produto_any
          FROM anymarket
        ) a ON p.ref_produto = a.ref_produto_vtex
        LEFT JOIN (
          SELECT DISTINCT id_produto_vtex, MAX(created_at) as last_sync_date
          FROM anymarket_sync_logs
          WHERE sync_type = 'info'
          GROUP BY id_produto_vtex
        ) asl_success ON p.id_produto_vtex = asl_success.id_produto_vtex
        LEFT JOIN (
          SELECT DISTINCT id_produto_vtex, MAX(created_at) as last_crop_date
          FROM anymarket_sync_logs
          WHERE sync_type = 'crop'
          GROUP BY id_produto_vtex
        ) asl_crop ON p.id_produto_vtex = asl_crop.id_produto_vtex
        LEFT JOIN titles t ON p.id_produto_vtex = t.id_product_vtex
        LEFT JOIN analise_imagens ai ON p.id_produto_vtex = ai.id_produto_vtex
        LEFT JOIN descriptions d ON p.id_produto_vtex = d.id_product_vtex
        LEFT JOIN (
          SELECT DISTINCT produto_id
          FROM respostas_caracteristicas
          WHERE resposta IS NOT NULL 
            AND resposta != ''
            AND resposta != 'N/A'
            AND LENGTH(TRIM(resposta)) > 2
        ) rc ON p.id_produto_vtex = rc.produto_id
        LEFT JOIN (
          SELECT 
            s.id_produto_vtex,
            SUM(COALESCE(st.total_quantity, 0)) as total_stock
          FROM skus_vtex s
          LEFT JOIN stock_vtex st ON s.id_sku_vtex = st.id_sku_vtex
          GROUP BY s.id_produto_vtex
        ) stock ON p.id_produto_vtex = stock.id_produto_vtex
        LEFT JOIN (
          SELECT DISTINCT ref_produto_vtex as product_id
          FROM anymarket
          WHERE id_produto_any IS NOT NULL
        ) asl ON p.id_produto_vtex = asl.product_id
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
          c.id_category_vtex as category_vtex_id,
          a.id_produto_any as anymarket_id,
          asl_success.last_sync_date as anymarket_enviado_any,
          asl_crop.last_crop_date as anymarket_imagem_cropada,
          t.title as optimized_title,
          0 as sku_count,
          0 as total_stock,
          CASE WHEN ai.id_produto_vtex IS NOT NULL THEN 1 ELSE 0 END as has_image_analysis,
          CASE WHEN t.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_optimized_title,
          CASE WHEN d.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_generated_description,
          CASE WHEN rc.produto_id IS NOT NULL THEN 1 ELSE 0 END as has_generated_characteristics,
          CASE WHEN asl.product_id IS NOT NULL THEN 1 ELSE 0 END as has_anymarket_sync
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
        LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
        LEFT JOIN (
          SELECT DISTINCT ref_produto_vtex, id_produto_any
          FROM anymarket
        ) a ON p.ref_produto = a.ref_produto_vtex
        LEFT JOIN (
          SELECT DISTINCT id_produto_vtex, MAX(created_at) as last_sync_date
          FROM anymarket_sync_logs
          WHERE sync_type = 'info'
          GROUP BY id_produto_vtex
        ) asl_success ON p.id_produto_vtex = asl_success.id_produto_vtex
        LEFT JOIN (
          SELECT DISTINCT id_produto_vtex, MAX(created_at) as last_crop_date
          FROM anymarket_sync_logs
          WHERE sync_type = 'crop'
          GROUP BY id_produto_vtex
        ) asl_crop ON p.id_produto_vtex = asl_crop.id_produto_vtex
        LEFT JOIN titles t ON p.id_produto_vtex = t.id_product_vtex
        LEFT JOIN analise_imagens ai ON p.id_produto_vtex = ai.id_produto_vtex
        LEFT JOIN descriptions d ON p.id_produto_vtex = d.id_product_vtex
        LEFT JOIN (
          SELECT DISTINCT produto_id
          FROM respostas_caracteristicas
          WHERE resposta IS NOT NULL 
            AND resposta != ''
            AND resposta != 'N/A'
            AND LENGTH(TRIM(resposta)) > 2
        ) rc ON p.id_produto_vtex = rc.produto_id
        LEFT JOIN (
          SELECT DISTINCT ref_produto_vtex as product_id
          FROM anymarket
          WHERE id_produto_any IS NOT NULL
        ) asl ON p.id_produto_vtex = asl.product_id
        ${whereClause}
        ORDER BY p.${validSortField} ${validOrder}
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    console.log('📝 Executando query de produtos...');
    console.log('🔍 Query:', productsQuery.substring(0, 200) + '...');
    console.log('📊 Parâmetros:', searchParams_array);
    
    // Log da query completa para debug
    console.log('🔍 Query completa:', productsQuery);
    
    let products;
    try {
      // Tentar executar a query completa com anymarket_sync_logs
      products = await executeQuery(productsQuery, searchParams_array);
    } catch (error: any) {
      // Se alguma tabela não existir, executar query sem ela
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠️ Alguma tabela não existe, executando query com fallback...');
        console.log('❌ Erro:', error.message);
        
        // Query de fallback que verifica se as tabelas existem
        const fallbackQuery = `
          SELECT 
            p.*,
            b.name as brand_name,
            c.name as category_name,
            c.id_category_vtex as category_vtex_id,
            a.id_produto_any as anymarket_id,
          asl_success.last_sync_date as anymarket_enviado_any,
          asl_crop.last_crop_date as anymarket_imagem_cropada,
            t.title as optimized_title,
            ${validSortField === 'total_stock' ? 'COALESCE(stock.total_stock, 0) as total_stock,' : '0 as sku_count, 0 as total_stock,'}
            CASE WHEN ai.id_produto_vtex IS NOT NULL THEN 1 ELSE 0 END as has_image_analysis,
            CASE WHEN t.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_optimized_title,
            CASE WHEN d.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_generated_description,
            CASE WHEN rc.produto_id IS NOT NULL THEN 1 ELSE 0 END as has_generated_characteristics,
            0 as has_anymarket_sync
          FROM products_vtex p
          LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
          LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
          LEFT JOIN (
            SELECT DISTINCT ref_produto_vtex, id_produto_any
            FROM anymarket
          ) a ON p.ref_produto = a.ref_produto_vtex
          LEFT JOIN titles t ON p.id_produto_vtex = t.id_product_vtex
          LEFT JOIN analise_imagens ai ON p.id_produto_vtex = ai.id_produto_vtex
          LEFT JOIN descriptions d ON p.id_produto_vtex = d.id_product_vtex
          LEFT JOIN (
            SELECT DISTINCT produto_id
            FROM respostas_caracteristicas
            WHERE resposta IS NOT NULL 
              AND resposta != ''
              AND resposta != 'N/A'
              AND LENGTH(TRIM(resposta)) > 2
          ) rc ON p.id_produto_vtex = rc.produto_id
          ${validSortField === 'total_stock' ? `
          LEFT JOIN (
            SELECT 
              s.id_produto_vtex,
              SUM(COALESCE(st.total_quantity, 0)) as total_stock
            FROM skus_vtex s
            LEFT JOIN stock_vtex st ON s.id_sku_vtex = st.id_sku_vtex
            GROUP BY s.id_produto_vtex
          ) stock ON p.id_produto_vtex = stock.id_produto_vtex
          ` : ''}
          ${whereClause}
          ORDER BY p.${validSortField} ${validOrder}
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        try {
          products = await executeQuery(fallbackQuery, searchParams_array);
        } catch (fallbackError: any) {
          // Se ainda der erro, usar query mínima
          console.log('⚠️ Query de fallback também falhou, usando query mínima...');
          console.log('❌ Erro do fallback:', fallbackError.message);
          
          const minimalQuery = `
            SELECT 
              p.*,
              b.name as brand_name,
              c.name as category_name,
              c.id_category_vtex as category_vtex_id,
              a.id_produto_any as anymarket_id,
          asl_success.last_sync_date as anymarket_enviado_any,
          asl_crop.last_crop_date as anymarket_imagem_cropada,
              t.title as optimized_title,
              0 as sku_count,
              0 as total_stock,
              CASE WHEN ai.id_produto_vtex IS NOT NULL THEN 1 ELSE 0 END as has_image_analysis,
              CASE WHEN t.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_optimized_title,
              CASE WHEN d.id_product_vtex IS NOT NULL THEN 1 ELSE 0 END as has_generated_description,
              0 as has_generated_characteristics,
              0 as has_anymarket_sync
            FROM products_vtex p
            LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
            LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
            LEFT JOIN (
              SELECT DISTINCT ref_produto_vtex, id_produto_any
              FROM anymarket
            ) a ON p.ref_produto = a.ref_produto_vtex
            LEFT JOIN titles t ON p.id_produto_vtex = t.id_product_vtex
            LEFT JOIN analise_imagens ai ON p.id_produto_vtex = ai.id_produto_vtex
            LEFT JOIN descriptions d ON p.id_produto_vtex = d.id_product_vtex
            ${whereClause}
            ORDER BY p.${validSortField} ${validOrder}
            LIMIT ${limit} OFFSET ${offset}
          `;
          
          products = await executeQuery(minimalQuery, searchParams_array);
        }
      } else {
        // Se for outro erro, relançar
        throw error;
      }
    }
    console.log('✅ Query executada com sucesso!');
    console.log('📊 Total de produtos retornados:', products.length);
    
    // Log para verificar o campo has_generated_description
    const productsWithDescription = products.filter(p => p.has_generated_description === 1);
    console.log('📝 Produtos com descrição gerada:', productsWithDescription.length);
    if (productsWithDescription.length > 0) {
      console.log('📋 Exemplos de produtos com descrição:', productsWithDescription.slice(0, 3).map(p => ({
        id: p.id_produto_vtex,
        name: p.name,
        has_generated_description: p.has_generated_description
      })));
    }

    // Adicionar contagem de SKUs e imagens para cada produto
    for (const product of products) {
      try {
        // Mapear id para compatibilidade com o frontend
        product.id = product.id_produto_vtex;
        // Contar SKUs
        const skuCountQuery = `
          SELECT COUNT(*) as sku_count
          FROM skus_vtex
          WHERE id_produto_vtex = ?
        `;
        const skuCountResult = await executeQuery(skuCountQuery, [product.id_produto_vtex]);
        product.sku_count = skuCountResult[0]?.sku_count || 0;

        // Contar imagens (usando os IDs dos SKUs do produto)
        const imageCountQuery = `
          SELECT COUNT(*) as image_count
          FROM images_vtex
          WHERE id_sku_vtex IN (
            SELECT id_sku_vtex FROM skus_vtex WHERE id_produto_vtex = ?
          )
        `;
        const imageCountResult = await executeQuery(imageCountQuery, [product.id_produto_vtex]);
        product.image_count = imageCountResult[0]?.image_count || 0;

        // Contar estoque (usando os IDs dos SKUs do produto) - apenas se não foi calculado na query principal
        if (validSortField !== 'total_stock') {
          const stockCountQuery = `
            SELECT COALESCE(SUM(st.total_quantity), 0) as total_stock
            FROM skus_vtex s
            LEFT JOIN stock_vtex st ON s.id_sku_vtex = st.id_sku_vtex
            WHERE s.id_produto_vtex = ?
          `;
          const stockCountResult = await executeQuery(stockCountQuery, [product.id_produto_vtex]);
          product.total_stock = stockCountResult[0]?.total_stock || 0;
        }

        // Buscar primeira SKU do produto
        const firstSkuQuery = `
          SELECT ref_sku, name as sku_name
          FROM skus_vtex
          WHERE id_produto_vtex = ?
          ORDER BY id_sku_vtex ASC
          LIMIT 1
        `;
        const firstSkuResult = await executeQuery(firstSkuQuery, [product.id_produto_vtex]);
        if (firstSkuResult && firstSkuResult.length > 0) {
          const sku = firstSkuResult[0];
          // Usar ref_sku se disponível, senão extrair do nome
          let firstSkuRef = sku.ref_sku;
          if (!firstSkuRef || firstSkuRef === 'null') {
            const match = sku.sku_name?.match(/\s-\s([^-]+)$/);
            if (match && match[1]) {
              firstSkuRef = match[1].trim();
            }
          }
          product.first_sku_ref = firstSkuRef || sku.sku_name;
        }

        // Buscar imagem principal do produto
        const imageQuery = `
          SELECT file_location, url
          FROM images_vtex
          WHERE id_sku_vtex IN (
            SELECT id_sku_vtex FROM skus_vtex WHERE id_produto_vtex = ?
          ) AND is_main = 1
          LIMIT 1
        `;
        const imageResult = await executeQuery(imageQuery, [product.id_produto_vtex]);
        if (imageResult && imageResult.length > 0) {
          product.main_image = imageResult[0].file_location || imageResult[0].url;
        } else {
          // Se não encontrar imagem principal, buscar qualquer imagem
          const anyImageQuery = `
            SELECT file_location, url
            FROM images_vtex
            WHERE id_sku_vtex IN (
              SELECT id_sku_vtex FROM skus_vtex WHERE id_produto_vtex = ?
            )
            LIMIT 1
          `;
          const anyImageResult = await executeQuery(anyImageQuery, [product.id_produto_vtex]);
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
      SELECT COUNT(DISTINCT p.id_produto_vtex) as total 
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      LEFT JOIN (
        SELECT DISTINCT ref_produto_vtex, id_produto_any
        FROM anymarket
      ) a ON p.ref_produto = a.ref_produto_vtex
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
    }, {
      headers: rateLimitCheck.headers
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produtos',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      `SELECT id_produto_vtex as id, name FROM products_vtex WHERE id_produto_vtex IN (${placeholders})`,
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
        `DELETE FROM products_vtex WHERE id_produto_vtex IN (${placeholders})`,
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

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
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

    // Filtros adicionais
    const brand_id = searchParams.getAll('brand_id');
    const category_id = searchParams.getAll('category_id');
    const has_image_analysis = searchParams.get('has_image_analysis');
    const has_marketplace_description = searchParams.get('has_marketplace_description');
    const has_anymarket_ref_id = searchParams.get('has_anymarket_ref_id');
    const has_anymarket_sync_log = searchParams.get('has_anymarket_sync_log');
    const is_active = searchParams.get('is_active');
    const is_visible = searchParams.get('is_visible');
    const has_images = searchParams.get('has_images');
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


    if (has_image_analysis) {
      if (has_image_analysis === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM image_analysis_logs al WHERE al.product_id = p.id)`);
      } else {
        conditions.push(`NOT EXISTS (SELECT 1 FROM image_analysis_logs al WHERE al.product_id = p.id)`);
      }
    }

    if (has_marketplace_description) {
      if (has_marketplace_description === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM meli m WHERE m.product_id = p.id)`);
      } else {
        conditions.push(`NOT EXISTS (SELECT 1 FROM meli m WHERE m.product_id = p.id)`);
      }
    }

    if (has_anymarket_ref_id) {
      if (has_anymarket_ref_id === 'true') {
        conditions.push(`a.id_any IS NOT NULL`);
      } else {
        conditions.push(`a.id_any IS NULL`);
      }
    }

    if (has_anymarket_sync_log) {
      if (has_anymarket_sync_log === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM anymarket_sync_logs sl WHERE sl.product_id = p.id AND sl.success = true)`);
      } else {
        conditions.push(`NOT EXISTS (SELECT 1 FROM anymarket_sync_logs sl WHERE sl.product_id = p.id AND sl.success = true)`);
      }
    }

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

    if (has_images) {
      if (has_images === 'true') {
        conditions.push(`EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id)`);
      } else if (has_images === 'false') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id)`);
      }
    }

    // Filtros de estoque
    if (stock_operator && stock_value !== null && stock_value !== '') {
      const stockValue = parseInt(stock_value);
      if (!isNaN(stockValue)) {
        switch (stock_operator) {
          case 'eq':
            conditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) = ?`);
            searchParams_array.push(stockValue);
            break;
          case 'gt':
            conditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) > ?`);
            searchParams_array.push(stockValue);
            break;
          case 'gte':
            conditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) >= ?`);
            searchParams_array.push(stockValue);
            break;
          case 'lt':
            conditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) < ?`);
            searchParams_array.push(stockValue);
            break;
          case 'lte':
            conditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) <= ?`);
            searchParams_array.push(stockValue);
            break;
        }
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Validar campos de ordenação
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'vtex_id', 'brand_name', 'category_name'];
    const validSortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Query para produtos com busca e ordenação, incluindo nomes de marca e categoria
    const productsQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        a.id_any as anymarket_id,
        (SELECT COUNT(*) FROM skus s WHERE s.product_id = p.id) as sku_count,
        (SELECT COUNT(*) FROM images i 
         JOIN skus s ON i.sku_id = s.id 
         WHERE s.product_id = p.id) as image_count,
        (SELECT CONCAT('https://projetoinfluencer.', i.file_location) FROM images i 
         JOIN skus s ON i.sku_id = s.id 
         WHERE s.product_id = p.id 
         ORDER BY i.created_at ASC 
         LIMIT 1) as first_image_url,
        COALESCE((SELECT SUM(st.total_quantity) 
                  FROM stock st 
                  JOIN skus s ON st.sku_id = s.id 
                  WHERE s.product_id = p.id), 0) as total_stock
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN anymarket a ON p.ref_id = a.ref_id
      ${whereClause}
      ORDER BY 
        CASE WHEN p.brand_id IS NOT NULL AND p.category_id IS NOT NULL THEN 0 ELSE 1 END,
        p.${validSortField} ${validOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const products = await executeQuery(productsQuery, searchParams_array);

    // Query para contar total com busca
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN anymarket a ON p.ref_id = a.ref_id
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
      `SELECT id, name FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Um ou mais produtos não foram encontrados'
      }, { status: 404 });
    }

    console.log(`📊 ${existingProducts.length} produtos encontrados para deletar`);

    // Deletar todos os dados vinculados
    try {
      // 1. Deletar logs de análise de imagens
      console.log('🗑️ Deletando logs de análise de imagens...');
      await executeQuery(
        `DELETE FROM image_analysis_logs WHERE product_id IN (${placeholders})`,
        productIds
      );

      // 2. Deletar dados do Marketplace
      console.log('🗑️ Deletando dados do Marketplace...');
      await executeQuery(
        `DELETE FROM meli WHERE product_id IN (${placeholders})`,
        productIds
      );

      // 3. Buscar SKUs dos produtos
      const skus = await executeQuery(
        `SELECT id FROM skus WHERE product_id IN (${placeholders})`,
        productIds
      );

      // 4. Para cada SKU, deletar imagens
      for (const sku of skus) {
        console.log(`🗑️ Deletando imagens do SKU ${sku.id}...`);
        await executeQuery(
          'DELETE FROM images WHERE sku_id = ?',
          [sku.id]
        );
      }

      // 5. Deletar SKUs
      console.log('🗑️ Deletando SKUs...');
      await executeQuery(
        `DELETE FROM skus WHERE product_id IN (${placeholders})`,
        productIds
      );

      // 6. Deletar os produtos
      console.log('🗑️ Deletando produtos...');
      await executeQuery(
        `DELETE FROM products WHERE id IN (${placeholders})`,
        productIds
      );

      console.log(`✅ ${existingProducts.length} produtos e todos os dados vinculados deletados com sucesso`);

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

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: Request) {
  try {
    // Evitar execução durante o build do Next.js
    if (process.env.NODE_ENV === 'production' && !process.env.RUNTIME_ENV) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro de produtos
    const is_active = searchParams.get('is_active') || '';
    const is_visible = searchParams.get('is_visible') || '';
    const has_images = searchParams.get('has_images') || '';
    const has_image_analysis = searchParams.get('has_image_analysis') || '';
    const has_marketplace_description = searchParams.get('has_marketplace_description') || '';
    const has_anymarket_ref_id = searchParams.get('has_anymarket_ref_id') || '';
    const has_anymarket_sync_log = searchParams.get('has_anymarket_sync_log') || '';
    const stock_operator = searchParams.get('stock_operator') || '';
    const stock_value = searchParams.get('stock_value') || '';
    const search = searchParams.get('search') || '';
    
    // Parâmetros para filtros cruzados
    const selected_brands = searchParams.get('selected_brands') || '';
    const selected_categories = searchParams.get('selected_categories') || '';

    console.log(`🔄 Buscando opções de filtros com totais`);

    // Construir condições WHERE para produtos
    const productWhereConditions = [];
    const queryParams = [];

    if (search) {
      productWhereConditions.push('(p.name LIKE ? OR p.ref_id LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (is_active !== '') {
      productWhereConditions.push('p.is_active = ?');
      queryParams.push(is_active === 'true' ? 1 : 0);
    }

    if (is_visible !== '') {
      productWhereConditions.push('p.is_visible = ?');
      queryParams.push(is_visible === 'true' ? 1 : 0);
    }

    if (has_images !== '') {
      if (has_images === 'true') {
        productWhereConditions.push('EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id)');
      } else {
        productWhereConditions.push('NOT EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id)');
      }
    }

    if (has_image_analysis !== '') {
      if (has_image_analysis === 'true') {
        productWhereConditions.push('EXISTS (SELECT 1 FROM image_analysis_logs al WHERE al.product_id = p.id)');
      } else {
        productWhereConditions.push('NOT EXISTS (SELECT 1 FROM image_analysis_logs al WHERE al.product_id = p.id)');
      }
    }

    if (has_marketplace_description !== '') {
      if (has_marketplace_description === 'true') {
        productWhereConditions.push('EXISTS (SELECT 1 FROM meli m WHERE m.product_id = p.id)');
      } else {
        productWhereConditions.push('NOT EXISTS (SELECT 1 FROM meli m WHERE m.product_id = p.id)');
      }
    }

    if (has_anymarket_ref_id !== '') {
      if (has_anymarket_ref_id === 'true') {
        productWhereConditions.push('a.id_any IS NOT NULL');
      } else {
        productWhereConditions.push('a.id_any IS NULL');
      }
    }

    if (has_anymarket_sync_log !== '') {
      if (has_anymarket_sync_log === 'true') {
        productWhereConditions.push('EXISTS (SELECT 1 FROM anymarket_sync_logs sl WHERE sl.product_id = p.id AND sl.success = true)');
      } else {
        productWhereConditions.push('NOT EXISTS (SELECT 1 FROM anymarket_sync_logs sl WHERE sl.product_id = p.id AND sl.success = true)');
      }
    }

    if (stock_operator && stock_value !== '') {
      const stockValue = parseInt(stock_value);
      if (!isNaN(stockValue)) {
        switch (stock_operator) {
          case 'eq':
            productWhereConditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) = ?`);
            queryParams.push(stockValue);
            break;
          case 'gt':
            productWhereConditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) > ?`);
            queryParams.push(stockValue);
            break;
          case 'gte':
            productWhereConditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) >= ?`);
            queryParams.push(stockValue);
            break;
          case 'lt':
            productWhereConditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) < ?`);
            queryParams.push(stockValue);
            break;
          case 'lte':
            productWhereConditions.push(`(SELECT COALESCE(SUM(st.total_quantity), 0) FROM stock st JOIN skus s ON st.sku_id = s.id WHERE s.product_id = p.id) <= ?`);
            queryParams.push(stockValue);
            break;
        }
      }
    }

    // Filtros cruzados - aplicar apenas para filtrar as opções disponíveis
    // Não aplicar como filtro de produtos, mas sim para limitar as opções retornadas
    let brandFilterForCategories = '';
    let categoryFilterForBrands = '';
    let brandParams: string[] = [];
    let categoryParams: string[] = [];

    if (selected_brands) {
      const brandIds = selected_brands.split(',').filter(id => id.trim() !== '');
      if (brandIds.length > 0) {
        const placeholders = brandIds.map(() => '?').join(',');
        brandFilterForCategories = `AND p.brand_id IN (${placeholders})`;
        brandParams = [...brandIds];
      }
    }

    if (selected_categories) {
      const categoryIds = selected_categories.split(',').filter(id => id.trim() !== '');
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        categoryFilterForBrands = `AND p.category_id IN (${placeholders})`;
        categoryParams = [...categoryIds];
      }
    }

    const productWhereClause = productWhereConditions.length > 0 ? `WHERE ${productWhereConditions.join(' AND ')}` : '';

    // Buscar marcas com totais
    const brandsQuery = `
      SELECT 
        b.id, 
        b.name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(st.total_quantity), 0) as total_stock
      FROM brands b
      INNER JOIN products p ON b.id = p.brand_id
      LEFT JOIN skus s ON p.id = s.product_id
      LEFT JOIN stock st ON s.id = st.sku_id
      LEFT JOIN anymarket a ON p.ref_id = a.ref_id
      ${productWhereClause}
      ${categoryFilterForBrands}
      GROUP BY b.id, b.name
      HAVING product_count > 0
      ORDER BY b.name ASC
    `;

    // Buscar categorias com totais
    const categoriesQuery = `
      SELECT 
        c.id, 
        c.name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(st.total_quantity), 0) as total_stock
      FROM categories c
      INNER JOIN products p ON c.id = p.category_id
      LEFT JOIN skus s ON p.id = s.product_id
      LEFT JOIN stock st ON s.id = st.sku_id
      LEFT JOIN anymarket a ON p.ref_id = a.ref_id
      ${productWhereClause}
      ${brandFilterForCategories}
      GROUP BY c.id, c.name
      HAVING product_count > 0
      ORDER BY c.name ASC
    `;

    console.log('🔍 Query SQL Marcas:', brandsQuery);
    console.log('🔍 Query SQL Categorias:', categoriesQuery);
    console.log('📊 Parâmetros da query:', queryParams);
    console.log('📊 Parâmetros de marca:', categoryParams);
    console.log('📊 Parâmetros de categoria:', brandParams);

    const [brands, categories] = await Promise.all([
      executeQuery(brandsQuery, [...queryParams, ...categoryParams]),
      executeQuery(categoriesQuery, [...queryParams, ...brandParams])
    ]);

    console.log(`✅ Retornando ${brands.length} marcas e ${categories.length} categorias filtradas`);

    // Converter total_stock para inteiros
    const processedBrands = (brands || []).map(brand => ({
      ...brand,
      product_count: parseInt(brand.product_count) || 0,
      total_stock: parseInt(brand.total_stock) || 0
    }));

    const processedCategories = (categories || []).map(category => ({
      ...category,
      product_count: parseInt(category.product_count) || 0,
      total_stock: parseInt(category.total_stock) || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        brands: processedBrands,
        categories: processedCategories
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar opções de filtros:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar opções de filtros',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

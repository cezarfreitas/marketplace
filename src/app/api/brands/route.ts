import { NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: Request) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const is_active = searchParams.get('is_active') || '';
    const auxiliary_data_generated = searchParams.get('auxiliary_data_generated') || '';
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';

    const offset = (page - 1) * limit;

    console.log(`🔄 Buscando marcas - Página: ${page}, Limite: ${limit}, Busca: "${search}", Status: "${is_active}", Auxiliar: "${auxiliary_data_generated}"`);

    // Construir condições WHERE
    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('b.name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (is_active !== '') {
      whereConditions.push('b.is_active = ?');
      queryParams.push(is_active === 'true' ? 1 : 0);
    }

    if (auxiliary_data_generated !== '') {
      whereConditions.push('b.auxiliary_data_generated = ?');
      queryParams.push(auxiliary_data_generated === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Campos permitidos para ordenação
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'vtex_id', 'product_count'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'name';
    const sortDirection = order === 'desc' ? 'DESC' : 'ASC';

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM brands b 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    console.log(`📊 Total de marcas encontradas: ${total}`);

    // Buscar marcas com contagem de produtos
    const brandsQuery = `
      SELECT 
        b.id, 
        b.vtex_id, 
        b.name, 
        b.is_active, 
        b.title, 
        b.meta_tag_description, 
        b.image_url, 
        b.brand_history, 
        b.target_audience, 
        b.language_type, 
        b.consumption_behavior, 
        b.visual_style, 
        b.auxiliary_data_generated, 
        b.brand_analysis, 
        b.created_at,
        b.updated_at,
        COALESCE(p.product_count, 0) as product_count
      FROM brands b
      LEFT JOIN (
        SELECT brand_id, COUNT(*) as product_count 
        FROM products 
        GROUP BY brand_id
      ) p ON b.id = p.brand_id
      ${whereClause}
      ORDER BY ${sortField === 'product_count' ? 'COALESCE(p.product_count, 0)' : `b.${sortField}`} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const brands = await executeQuery(brandsQuery, queryParams);

    console.log(`✅ Retornando ${brands.length} marcas`);

    return NextResponse.json({
      success: true,
      data: {
        brands: brands || [],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        search,
        filters: {
          is_active,
          auxiliary_data_generated
        },
        sort: {
          field: sortField,
          direction: order
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar marcas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar marcas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID da marca é obrigatório'
      }, { status: 400 });
    }

    // Verificar se a marca existe
    const existingBrands = await executeQuery(
      'SELECT id FROM brands WHERE id = ?',
      [id]
    );

    if (existingBrands.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    // Deletar a marca
    await executeQuery('DELETE FROM brands WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Marca deletada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao deletar marca:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar marca',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

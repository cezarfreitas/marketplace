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
    const has_children = searchParams.get('has_children') || '';
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';

    const offset = (page - 1) * limit;

    console.log(`🔄 Buscando categorias - Página: ${page}, Limite: ${limit}, Busca: "${search}", Status: "${is_active}", Com filhos: "${has_children}"`);

    // Construir condições WHERE
    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('c.name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (is_active !== '') {
      whereConditions.push('c.is_active = ?');
      queryParams.push(is_active === 'true' ? 1 : 0);
    }

    if (has_children !== '') {
      whereConditions.push('c.has_children = ?');
      queryParams.push(has_children === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Campos permitidos para ordenação
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'id', 'id_category_vtex', 'product_count'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'name';
    const sortDirection = order === 'desc' ? 'DESC' : 'ASC';

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM categories_vtex c 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;


    // Buscar categorias
    const categoriesQuery = `
      SELECT 
        c.id_category_vtex as id, 
        c.id_category_vtex, 
        c.name, 
        c.father_category_id,
        c.title,
        c.description,
        c.is_active,
        c.has_children,
        c.created_at,
        c.updated_at,
        COALESCE(p.product_count, 0) as product_count,
        parent.name as parent_name
      FROM categories_vtex c
      LEFT JOIN categories_vtex parent ON c.father_category_id = parent.id_category_vtex
      LEFT JOIN (
        SELECT 
          p.id_category_vtex,
          COUNT(*) as product_count
        FROM products_vtex p
        GROUP BY p.id_category_vtex
      ) p ON c.id_category_vtex = p.id_category_vtex
      ${whereClause}
      ORDER BY ${sortField === 'product_count' ? 'COALESCE(p.product_count, 0)' : `c.${sortField}`} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const categories = await executeQuery(categoriesQuery, queryParams);


    return NextResponse.json({
      success: true,
      data: {
        categories: categories || [],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        search,
        filters: {
          is_active,
          has_children
        },
        sort: {
          field: sortField,
          direction: order
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar categorias:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar categorias',
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
        message: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }

    // Verificar se a categoria existe
    const existingCategories = await executeQuery(
      'SELECT id_category_vtex FROM categories_vtex WHERE id_category_vtex = ?',
      [id]
    );

    if (existingCategories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Categoria não encontrada'
      }, { status: 404 });
    }

    // Verificar se a categoria tem produtos associados
    const productsCount = await executeQuery(
      'SELECT COUNT(*) as count FROM products_vtex WHERE id_category_vtex = ?',
      [id]
    );

    if (productsCount[0]?.count > 0) {
      return NextResponse.json({
        success: false,
        message: 'Não é possível excluir categoria que possui produtos associados'
      }, { status: 400 });
    }

    // Deletar a categoria
    await executeQuery('DELETE FROM categories_vtex WHERE id_category_vtex = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Categoria deletada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao deletar categoria:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar categoria',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

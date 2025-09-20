import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    console.log('🔍 Buscando categorias VTEX...');

    let query = `
      SELECT 
        id_category_vtex as id,
        id_category_vtex,
        name,
        father_category_id,
        title,
        description,
        is_active,
        has_children,
        created_at,
        updated_at
      FROM categories_vtex
    `;

    const conditions = [];
    const params = [];

    if (isActive !== null) {
      conditions.push('is_active = ?');
      params.push(isActive === 'true');
    }

    if (search) {
      conditions.push('(name LIKE ? OR title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY name ASC`;

    const categories = await executeQuery(query, params);

    console.log(`✅ ${categories?.length || 0} categorias encontradas`);

    return NextResponse.json({
      success: true,
      data: categories || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar categorias VTEX:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar categorias VTEX',
      error: error.message
    }, { status: 500 });
  }
}

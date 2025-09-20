import { NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando categorias para filtros...');

    const query = `
      SELECT 
        id_category_vtex as id,
        name
      FROM categories_vtex 
      WHERE is_active = 1
      ORDER BY name ASC
    `;

    const categories = await executeQuery(query, []);

    console.log(`✅ ${categories?.length || 0} categorias encontradas para filtros`);

    return NextResponse.json({
      success: true,
      data: categories || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar categorias para filtros:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar categorias',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando marcas para filtros...');

    const query = `
      SELECT 
        id_brand_vtex as id,
        name
      FROM brands_vtex 
      WHERE is_active = 1
      ORDER BY name ASC
    `;

    const brands = await executeQuery(query, []);

    console.log(`✅ ${brands?.length || 0} marcas encontradas para filtros`);

    return NextResponse.json({
      success: true,
      data: brands || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar marcas para filtros:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar marcas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

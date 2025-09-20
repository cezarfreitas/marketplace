import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { refIds } = await request.json();

    if (!refIds || !Array.isArray(refIds)) {
      return NextResponse.json({
        success: false,
        message: 'Lista de refIds é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando mapeamentos Anymarket para ${refIds.length} produtos...`);

    // Buscar mapeamentos na tabela anymarket
    const placeholders = refIds.map(() => '?').join(',');
    const query = `
      SELECT ref_produto_vtex, id_produto_any 
      FROM anymarket 
      WHERE ref_produto_vtex IN (${placeholders})
    `;

    const mappings = await executeQuery(query, refIds);

    // Criar um mapa para fácil acesso
    const mappingMap: Record<string, string> = {};
    mappings.forEach((mapping: any) => {
      mappingMap[mapping.ref_produto_vtex] = mapping.id_produto_any;
    });

    console.log(`✅ Encontrados ${mappings.length} mapeamentos Anymarket`);

    return NextResponse.json({
      success: true,
      data: {
        mappings: mappingMap,
        totalFound: mappings.length,
        totalRequested: refIds.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar mapeamentos Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar mapeamentos',
      error: error.message
    }, { status: 500 });
  }
}

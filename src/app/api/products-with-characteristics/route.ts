import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando produtos com características geradas...');

    // Buscar produtos que têm características geradas
    const characteristicsQuery = `
      SELECT DISTINCT produto_id
      FROM respostas_caracteristicas
      WHERE resposta IS NOT NULL 
        AND resposta != ''
        AND resposta != 'N/A'
        AND resposta != 'n/a'
        AND resposta != 'na'
        AND resposta != 'não disponível'
        AND resposta != 'não identificável'
        AND resposta != 'não aplicável'
        AND resposta != 'não se aplica'
        AND resposta != 'não especificado'
        AND resposta != 'não informado'
        AND resposta != 'não definido'
        AND resposta != 'não determinado'
        AND resposta != 'não identificado'
        AND resposta != 'não encontrado'
        AND LENGTH(TRIM(resposta)) > 2
      ORDER BY produto_id ASC
    `;

    const characteristics = await executeQuery(characteristicsQuery, []);
    
    const productIds = characteristics?.map((item: any) => item.produto_id) || [];
    
    console.log(`✅ ${productIds.length} produtos com características encontrados`);

    return NextResponse.json({
      success: true,
      data: productIds
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos com características:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar produtos com características',
      error: error.message
    }, { status: 500 });
  }
}


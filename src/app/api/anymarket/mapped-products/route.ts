import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando produtos sincronizados com Anymarket (com data_sincronizacao preenchida)...');

    // Buscar produtos que têm mapeamento na tabela anymarket E data_sincronizacao preenchida
    const query = `
      SELECT DISTINCT p.id, p.name, p.ref_id, a.id_produto_any, a.data_sincronizacao
      FROM products_vtex p
      INNER JOIN anymarket a ON p.ref_id = a.ref_vtex
      WHERE a.ref_vtex IS NOT NULL 
        AND a.ref_vtex != '0'
        AND a.id_produto_any IS NOT NULL
        AND a.data_sincronizacao IS NOT NULL
      ORDER BY p.id
    `;

    const products = await executeQuery(query, []);
    
    console.log(`✅ Encontrados ${products.length} produtos sincronizados com Anymarket`);

    return NextResponse.json({
      success: true,
      data: products
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos com mapeamento Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produtos mapeados',
      error: error.message
    }, { status: 500 });
  }
}

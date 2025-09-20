import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando produtos com descrições...');

    // Buscar todos os produtos que têm descrições na tabela descriptions
    const query = `
      SELECT DISTINCT id_product_vtex 
      FROM descriptions 
      WHERE status = 'generated'
      ORDER BY id_product_vtex
    `;

    const products = await executeQuery(query, []);
    console.log('📊 Produtos com descrições encontrados:', products?.length || 0);

    // Extrair apenas os IDs dos produtos
    const productIds = products?.map((product: any) => product.id_product_vtex) || [];

    return NextResponse.json({
      success: true,
      data: productIds
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos com descrições:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produtos com descrições',
      error: error.message
    }, { status: 500 });
  }
}


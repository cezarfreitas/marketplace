import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { title, productId } = await request.json();

    if (!title || !productId) {
      return NextResponse.json({
        success: false,
        message: 'Título e ID do produto são obrigatórios'
      }, { status: 400 });
    }

    // Verificar na tabela titles (títulos gerados)
    const titlesQuery = `
      SELECT COUNT(*) as count 
      FROM titles 
      WHERE title = ? AND id_product_vtex != ?
    `;
    const titlesResult = await executeQuery(titlesQuery, [title, productId]);
    console.log(`🔍 API: Resultado da query:`, titlesResult);
    const titlesCount = parseInt((titlesResult[0] as any).count) || 0;
    
    const isUnique = titlesCount === 0;
    
    console.log(`🔍 API: Título "${title}" para produto ${productId}`);
    console.log(`🔍 API: titlesCount = ${titlesCount} (tipo: ${typeof titlesCount})`);
    console.log(`🔍 API: isUnique = ${isUnique} (tipo: ${typeof isUnique})`);
    console.log(`🔍 API: Comparação titlesCount === 0: ${titlesCount === 0}`);

    return NextResponse.json({
      success: true,
      isUnique: isUnique,
      details: {
        titlesCount
      }
    });

  } catch (error: any) {
    console.error('Erro ao verificar unicidade do título:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

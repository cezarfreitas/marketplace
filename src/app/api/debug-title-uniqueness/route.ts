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

    console.log(`🔍 DEBUG: Verificando título "${title}" para produto ${productId}`);

    // 1. Verificar todos os títulos na tabela titles
    const allTitlesQuery = `SELECT id_product_vtex, title FROM titles WHERE title = ?`;
    const allTitlesResult = await executeQuery(allTitlesQuery, [title]);
    console.log(`📊 Todos os títulos "${title}" na tabela titles:`, allTitlesResult);

    // 2. Verificar títulos excluindo o produto atual
    const titlesQuery = `
      SELECT COUNT(*) as count 
      FROM titles 
      WHERE title = ? AND id_product_vtex != ?
    `;
    const titlesResult = await executeQuery(titlesQuery, [title, productId]);
    const titlesCount = (titlesResult[0] as any).count;
    console.log(`📊 Títulos excluindo produto ${productId}:`, titlesCount);

    const isUnique = titlesCount === 0;

    return NextResponse.json({
      success: true,
      title: title,
      productId: productId,
      isUnique: isUnique,
      details: {
        allTitlesInTitles: allTitlesResult,
        titlesCount: titlesCount
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

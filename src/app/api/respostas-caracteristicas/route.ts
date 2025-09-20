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
    const productId = searchParams.get('productId');

    console.log('🔍 Buscando respostas de características...', productId ? `para produto ${productId}` : 'para todos os produtos');

    let query = `
      SELECT 
        rc.id,
        rc.produto_id,
        rc.caracteristica,
        rc.resposta,
        rc.tokens_usados,
        rc.created_at,
        rc.updated_at
      FROM respostas_caracteristicas rc
      INNER JOIN caracteristicas c ON rc.caracteristica = c.caracteristica
    `;

    if (productId) {
      // Buscar o vtex_id da categoria do produto
      const productQuery = `
        SELECT p.id_category_vtex as category_id, cv.id_category_vtex as category_vtex_id
        FROM products_vtex p
        LEFT JOIN categories_vtex cv ON p.id_category_vtex = cv.id_category_vtex
        WHERE p.id_produto_vtex = ?
      `;
      
      const productResult = await executeQuery(productQuery, [parseInt(productId)]);
      
      if (productResult && productResult.length > 0) {
        const categoryVtexId = productResult[0].category_vtex_id;
        
        if (categoryVtexId) {
          query += ` WHERE rc.produto_id = ${parseInt(productId)} 
                     AND c.is_active = TRUE 
                     AND c.categorias IS NOT NULL 
                     AND c.categorias != '' 
                     AND TRIM(c.categorias) != ''
                     AND FIND_IN_SET('${categoryVtexId}', c.categorias) > 0`;
        } else {
          // Se não tem category_vtex_id, não retorna nada
          query += ` WHERE rc.produto_id = ${parseInt(productId)} AND 1 = 0`;
        }
      } else {
        // Se produto não existe, não retorna nada
        query += ` WHERE rc.produto_id = ${parseInt(productId)} AND 1 = 0`;
      }
    } else {
      // Para todos os produtos, filtrar apenas características ativas com categorias configuradas
      query += ` WHERE c.is_active = TRUE 
                 AND c.categorias IS NOT NULL 
                 AND c.categorias != '' 
                 AND TRIM(c.categorias) != ''`;
    }

    query += ` ORDER BY rc.produto_id, rc.caracteristica ASC`;

    const respostas = await executeQuery(query);

    console.log(`✅ ${respostas?.length || 0} respostas de características encontradas`);

    return NextResponse.json({
      success: true,
      data: respostas || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar respostas de características:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar respostas de características',
      error: error.message
    }, { status: 500 });
  }
}

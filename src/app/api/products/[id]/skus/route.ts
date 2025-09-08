import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log('🔍 Buscando SKUs para produto ID:', productId);

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    // Verificar se a tabela skus existe
    const checkTableQuery = `SHOW TABLES LIKE 'skus'`;
    const tableExists = await executeQuery(checkTableQuery, []);
    
    if (tableExists.length === 0) {
      console.log('⚠️ Tabela skus não existe, retornando array vazio');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Verificar estrutura da tabela skus
    const describeQuery = `DESCRIBE skus`;
    const tableStructure = await executeQuery(describeQuery, []);
    console.log('📋 Estrutura da tabela skus:', tableStructure);

    // Buscar SKUs do produto
    const query = `
      SELECT 
        s.*
      FROM skus s
      WHERE s.product_id = ?
    `;

    const skus = await executeQuery(query, [productId]);
    console.log('📦 SKUs encontrados para produto', productId, ':', skus.length);

    return NextResponse.json({
      success: true,
      data: skus
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKUs do produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar SKUs',
      error: error.message
    }, { status: 500 });
  }
}

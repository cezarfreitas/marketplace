import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log('🔍 Buscando imagens para produto ID:', productId);

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    // Verificar se as tabelas existem
    const checkTablesQuery = `SHOW TABLES LIKE 'images'`;
    const imagesTableExists = await executeQuery(checkTablesQuery, []);
    
    if (imagesTableExists.length === 0) {
      console.log('⚠️ Tabela images não existe, retornando array vazio');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Verificar estrutura da tabela images
    const describeQuery = `DESCRIBE images`;
    const tableStructure = await executeQuery(describeQuery, []);
    console.log('📋 Estrutura da tabela images:', tableStructure);

    // Buscar imagens do produto
    const query = `
      SELECT 
        i.*,
        CONCAT('https://projetoinfluencer.', i.file_location) as file_url
      FROM images i
      JOIN skus s ON i.sku_id = s.id
      WHERE s.product_id = ?
    `;

    const images = await executeQuery(query, [productId]);
    console.log('🖼️ Imagens encontradas para produto', productId, ':', images.length);

    return NextResponse.json({
      success: true,
      data: images
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar imagens do produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar imagens',
      error: error.message
    }, { status: 500 });
  }
}

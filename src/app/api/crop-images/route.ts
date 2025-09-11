import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  try {
    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🖼️ Iniciando busca de imagens da VTEX para produto:', productId);

    // Buscar imagens do produto no banco de dados (tabela images vinculada por sku_id)
    let imagesData;
    try {
      const { executeQuery } = await import('@/lib/database');
      imagesData = await executeQuery(`
        SELECT 
          i.id,
          i.file_location,
          i.text as alt_text,
          i.is_main as is_primary,
          i.position,
          s.id as sku_id,
          s.name as sku_name
        FROM images_vtex i
        INNER JOIN skus_vtex s ON i.sku_id = s.id
        WHERE s.product_id = ?
        ORDER BY i.is_main DESC, i.position ASC, i.id ASC
      `, [productId]);

      console.log('✅ Imagens encontradas no banco:', imagesData.length);
    } catch (error: any) {
      console.error('❌ Erro ao buscar imagens do banco:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar imagens do banco: ' + error.message
      }, { status: 400 });
    }

    console.log('📊 Dados das imagens do banco:', JSON.stringify(imagesData, null, 2));

    // Se não há imagens no banco, retornar erro
    if (imagesData.length === 0) {
      console.log('⚠️ Nenhuma imagem encontrada no banco de dados');
      return NextResponse.json({
        success: false,
        message: 'Nenhuma imagem encontrada no banco de dados para este produto'
      }, { status: 404 });
    }

    // Preparar URLs das imagens para processamento
    const imageUrls = imagesData.map(image => {
      const imageUrl = `https://projetoinfluencer.${image.file_location}`;
      return {
        id: image.id,
        skuId: image.sku_id,
        skuName: image.sku_name,
        skuColor: null, // Coluna complement_name não existe
        url: imageUrl,
        isPrimary: image.is_primary,
        position: image.position
      };
    });

    console.log(`📋 URLs das imagens preparadas:`, imageUrls);

    // Retornar apenas as URLs das imagens que serão processadas
    return NextResponse.json({
      success: true,
      message: `Encontradas ${imageUrls.length} imagens da VTEX para processar`,
      data: {
        totalImages: imageUrls.length,
        images: imageUrls,
        productId: productId,
        anymarketId: anymarketId
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno no processamento:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório'
      }, { status: 400 });
    }

    console.log('🔍 Buscando imagens da VTEX para produto:', productId);

    // Buscar imagens dos SKUs da VTEX
    const { executeQuery } = await import('@/lib/database');
    const vtexImages = await executeQuery(`
      SELECT 
        i.id,
        i.file_location,
        i.text as alt_text,
        i.is_main as is_primary,
        i.position,
        s.id as sku_id,
        s.name as sku_name,
        NULL as sku_color
      FROM images_vtex i
      INNER JOIN skus_vtex s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.is_main DESC, i.position ASC, i.id ASC
    `, [productId]);

    console.log(`📸 Encontradas ${vtexImages.length} imagens da VTEX`);

    // Processar as imagens para incluir URLs completas
    const processedImages = vtexImages.map((image: any) => ({
      id: image.id,
      file_location: image.file_location,
      alt_text: image.alt_text,
      is_primary: image.is_primary,
      position: image.position,
      sku_id: image.sku_id,
      sku_name: image.sku_name,
      sku_color: image.sku_color,
      full_url: `https://projetoinfluencer.${image.file_location}`,
      thumbnail_url: `https://projetoinfluencer.${image.file_location}`
    }));

    return NextResponse.json({
      success: true,
      message: `${vtexImages.length} imagens da VTEX encontradas`,
      data: processedImages
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar imagens da VTEX:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar imagens da VTEX',
      error: error.message
    }, { status: 500 });
  }
}

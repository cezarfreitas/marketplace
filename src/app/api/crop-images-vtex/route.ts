import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🖼️ Iniciando processamento com imagens da VTEX para produto:', productId);

    // 1. Buscar imagens do produto no Anymarket para deletar
    let anymarketImages;
    try {
      const anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
        method: 'GET',
        headers: {
          'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!anymarketResponse.ok) {
        throw new Error(`Erro ao buscar imagens do Anymarket: ${anymarketResponse.status}`);
      }

      anymarketImages = await anymarketResponse.json();
      console.log('✅ Imagens do Anymarket encontradas:', anymarketImages.length);
      console.log('📊 Dados brutos das imagens do Anymarket:', JSON.stringify(anymarketImages, null, 2));
    } catch (error: any) {
      console.error('❌ Erro ao buscar imagens do Anymarket:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar imagens do Anymarket: ' + error.message
      }, { status: 400 });
    }

    // 2. Deletar todas as imagens do Anymarket
    console.log('🗑️ Deletando todas as imagens do Anymarket...');
    for (const image of anymarketImages) {
      try {
        const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images/${image.id}`, {
          method: 'DELETE',
          headers: {
            'gumgaToken': 'MjU5MDYwMTI2Lg==.xk0BLaBr6Xp5ErWLBXq/Fp7MebhAY9G8/cduGnJECoETHLw1AvWwEFcX5z68M0HtWzBJazQWW5eNBL+eMUnHjw=='
          }
        });

        if (deleteResponse.ok) {
          console.log(`✅ Imagem ${image.id} deletada`);
        } else {
          console.warn(`⚠️ Erro ao deletar imagem ${image.id}:`, deleteResponse.status);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao deletar imagem ${image.id}:`, error);
      }
    }

    // 3. Buscar imagens da VTEX do produto
    console.log('🔍 Buscando imagens da VTEX...');
    const vtexImages = await executeQuery(`
      SELECT 
        i.id,
        i.file_location,
        i.text as alt_text,
        i.is_main as is_primary,
        i.position,
        s.id as sku_id,
        s.sku_name,
        s.complement_name as sku_color
      FROM images i
      INNER JOIN skus s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.is_main DESC, i.position ASC, i.id ASC
    `, [productId]);

    if (!vtexImages || vtexImages.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma imagem da VTEX encontrada para este produto'
      }, { status: 404 });
    }

    console.log(`✅ ${vtexImages.length} imagens da VTEX encontradas`);

    const results = [];
    const errors = [];

    // 4. Processar cada imagem da VTEX
    for (let i = 0; i < vtexImages.length; i++) {
      const vtexImage = vtexImages[i];
      console.log(`📸 Processando imagem VTEX ${i + 1}/${vtexImages.length}: ${vtexImage.id}`);

      try {
        // Construir URL da imagem VTEX
        const vtexImageUrl = `https://projetoinfluencer.${vtexImage.file_location}`;
        console.log('🔗 URL da imagem VTEX:', vtexImageUrl);

        // 5. Baixar imagem da VTEX
        const imageResponse = await fetch(vtexImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Erro ao baixar imagem da VTEX: ${imageResponse.status}`);
        }
        const originalImageBuffer = await imageResponse.arrayBuffer();
        console.log('✅ Imagem da VTEX baixada');

        // 6. Processar no Pixian.ai usando JSON (formato curl)
        const pixianData = {
          image: {
            url: vtexImageUrl
          },
          background: {
            color: "#FFFFFF"
          },
          result: {
            crop_to_foreground: true,
            target_size: "1500 1500",
            vertical_alignment: "middle",
            margin: "0px 150px 0px 150px"
          },
          output: {
            format: "jpeg",
            jpeg_quality: 90
          }
        };

        const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pixianData)
        });

        if (!pixianResponse.ok) {
          const errorText = await pixianResponse.text();
          throw new Error(`Erro no Pixian: ${pixianResponse.status} - ${errorText}`);
        }

        const croppedImageBuffer = await pixianResponse.arrayBuffer();
        console.log('✅ Imagem processada no Pixian');

        // 7. Salvar imagem processada no servidor
        const fileName = `${anymarketId}_vtex_${vtexImage.id}.jpg`;
        const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');
        
        // Fazer upload da imagem para o servidor
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('origin') || 'http://localhost:3002'}`;
        const uploadResponse = await fetch(`${baseUrl}/api/upload-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: `data:image/jpeg;base64,${croppedImageBase64}`,
            fileName: fileName
          })
        });

        if (!uploadResponse.ok) {
          throw new Error('Erro ao fazer upload da imagem para o servidor');
        }

        const uploadResult = await uploadResponse.json();
        const newImageUrl = uploadResult.data.publicUrl;
        console.log('📤 Imagem salva no servidor:', newImageUrl);

        // 8. Fazer upload da nova imagem para o Anymarket
        const anymarketUploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
          method: 'POST',
          headers: {
            'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            index: i, // Index sequencial: 0, 1, 2, 3...
            main: i === 0, // Primeira imagem (index 0) é main: true, demais false
            url: newImageUrl
          })
        });

        if (!anymarketUploadResponse.ok) {
          const errorText = await anymarketUploadResponse.text();
          throw new Error(`Erro no upload para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`);
        }

        console.log('✅ Nova imagem enviada para Anymarket');

        results.push({
          vtexImageId: vtexImage.id,
          skuId: vtexImage.sku_id,
          skuName: vtexImage.sku_name,
          skuColor: vtexImage.sku_color,
          position: vtexImage.position,
          anymarketIndex: i, // Index no Anymarket: 0, 1, 2, 3...
          isMain: i === 0, // Primeira imagem é principal
          originalVtexUrl: vtexImageUrl,
          newUrl: newImageUrl,
          croppedBase64: croppedImageBase64,
          fileName: fileName,
          success: true,
          uploadedToAnymarket: true
        });

      } catch (error: any) {
        console.error(`❌ Erro ao processar imagem VTEX ${vtexImage.id}:`, error);
        errors.push({
          vtexImageId: vtexImage.id,
          skuId: vtexImage.sku_id,
          skuName: vtexImage.sku_name,
          error: error.message
        });
      }

      // Pequena pausa entre processamentos
      if (i < vtexImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} imagens da VTEX processadas e enviadas para o Anymarket com sucesso`,
      data: {
        totalVtexImages: vtexImages.length,
        processed: results.length,
        errorCount: errors.length,
        results,
        errorDetails: errors,
        note: 'Imagens da VTEX processadas e enviadas automaticamente para o Anymarket.'
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

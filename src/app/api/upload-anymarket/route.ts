import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { anymarketId, images } = await request.json();

    if (!anymarketId || !images || !Array.isArray(images)) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId e images (array) são obrigatórios'
      }, { status: 400 });
    }

    console.log('🛒 Iniciando upload para Anymarket:', {
      anymarketId,
      totalImages: images.length
    });

    const results = [];
    const errors = [];

    // Processar cada imagem
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`📤 Uploadando imagem ${i + 1}/${images.length}: ${image.skuName}`);

      try {
        // Preparar dados do upload
        const uploadData = {
          index: i, // Posição sequencial: 0, 1, 2, 3...
          main: i === 0, // true apenas para a primeira imagem (index 0)
          url: image.processedUrl
        };

        console.log('📋 Dados do upload:', {
          index: uploadData.index,
          main: uploadData.main,
          url: uploadData.url,
          skuName: image.skuName
        });

        // Fazer upload para o Anymarket
        const anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg=='
          },
          body: JSON.stringify(uploadData)
        });

        if (!anymarketResponse.ok) {
          const errorText = await anymarketResponse.text();
          console.error(`❌ Erro no upload para Anymarket:`, {
            status: anymarketResponse.status,
            statusText: anymarketResponse.statusText,
            error: errorText,
            data: uploadData
          });
          throw new Error(`Erro no upload para Anymarket: ${anymarketResponse.status} - ${errorText}`);
        }

        const anymarketResult = await anymarketResponse.json();
        console.log(`✅ Imagem enviada para Anymarket:`, {
          newImageId: anymarketResult.id,
          index: uploadData.index,
          main: uploadData.main,
          skuName: image.skuName
        });

        results.push({
          imageId: image.id,
          skuName: image.skuName,
          skuColor: image.skuColor,
          newImageId: anymarketResult.id,
          index: i,
          main: i === 0,
          originalUrl: image.originalUrl,
          processedUrl: image.processedUrl,
          fileName: image.fileName,
          success: true,
          anymarketResponse: anymarketResult,
          requestDetails: {
            anymarket: {
              endpoint: `https://api.anymarket.com.br/v2/products/${anymarketId}/images`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg=='
              },
              payload: uploadData,
              curlCommand: `curl -X POST "https://api.anymarket.com.br/v2/products/${anymarketId}/images" \\
  -H "Content-Type: application/json" \\
  -H "gumgaToken: MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==" \\
  -d '${JSON.stringify(uploadData)}'`
            }
          }
        });

      } catch (error: any) {
        console.error(`❌ Erro ao fazer upload da imagem ${image.skuName}:`, error);
        errors.push({
          imageId: image.id,
          skuName: image.skuName,
          skuColor: image.skuColor,
          error: error.message
        });
      }

      // Pequena pausa entre uploads
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Retornar resultados
    const totalProcessed = results.length;
    const totalErrors = errors.length;

    console.log(`📊 Resumo do upload para Anymarket:`, {
      totalProcessed,
      totalErrors,
      successRate: `${((totalProcessed / images.length) * 100).toFixed(1)}%`
    });

    return NextResponse.json({
      success: true,
      message: `${totalProcessed} imagens enviadas para o Anymarket com sucesso`,
      data: {
        totalImages: images.length,
        totalProcessed,
        totalErrors,
        successRate: `${((totalProcessed / images.length) * 100).toFixed(1)}%`,
        results,
        errors
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno no upload para Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

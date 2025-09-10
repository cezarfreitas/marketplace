import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🖼️ Iniciando processamento automático de todas as imagens para produto:', productId);

    // 1. Buscar imagens do produto no Anymarket
    let imagesData;
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
        throw new Error(`Erro ao buscar imagens: ${anymarketResponse.status}`);
      }

      imagesData = await anymarketResponse.json();
      console.log('✅ Imagens encontradas:', imagesData.length);
    } catch (error: any) {
      console.error('❌ Erro ao buscar imagens:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar imagens: ' + error.message
      }, { status: 400 });
    }

    console.log('📊 Dados brutos das imagens:', JSON.stringify(imagesData, null, 2));

    // Filtrar apenas imagens com originalImage
    const originalImages = imagesData.filter((img: any) => img.originalImage);
    
    console.log(`🔍 Total de imagens: ${imagesData.length}`);
    console.log(`🔍 Imagens com originalImage: ${originalImages.length}`);
    
    // Se não há imagens no Anymarket, continuar para etapa 2 (SKUs da VTEX)
    if (imagesData.length === 0) {
      console.log('⚠️ Nenhuma imagem encontrada no Anymarket, continuando para etapa 2 (SKUs da VTEX)');
    }
    
    if (originalImages.length === 0) {
      console.log('⚠️ Nenhuma imagem com originalImage no Anymarket, continuando para etapa 2 (SKUs da VTEX)');
    }

    console.log(`🔄 Processando ${originalImages.length} imagens...`);

    const results = [];
    const errors = [];

    // Processar cada imagem
    for (let i = 0; i < originalImages.length; i++) {
      const image = originalImages[i];
      console.log(`📸 Processando imagem ${i + 1}/${originalImages.length}: ${image.id}`);

      try {
        // 2. Processar no Pixian.ai usando JSON (formato curl)
        const pixianData = {
          image: {
            url: image.originalImage
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

        // 3. Salvar imagem processada no servidor
        const fileName = `${anymarketId}_${image.id}.jpg`;
        const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');
        
        // Fazer upload da imagem para o servidor
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload-image`, {
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

        // 4. Deletar imagem antiga do Anymarket
        console.log(`🗑️ Deletando imagem antiga ${image.id} do Anymarket...`);
        const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images/${image.id}`, {
          method: 'DELETE',
          headers: {
            'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
            'Content-Type': 'application/json',
            'User-Agent': 'Meli-Integration/1.0'
          }
        });

        if (!deleteResponse.ok) {
          console.warn(`⚠️ Erro ao deletar imagem antiga ${image.id}:`, deleteResponse.status);
          // Continuar mesmo se não conseguir deletar
        } else {
          console.log(`✅ Imagem antiga ${image.id} deletada do Anymarket`);
        }

        // 5. Fazer upload da nova imagem para o Anymarket (usando URL)
        console.log(`📤 Enviando nova imagem para Anymarket...`);
        
        const anymarketUploadData = {
          index: i, // Posição sequencial: 0, 1, 2, 3...
          main: i === 0, // true apenas para a primeira imagem (index 0)
          url: newImageUrl
        };
        
        console.log('📋 Dados do upload:', {
          index: anymarketUploadData.index,
          main: anymarketUploadData.main,
          url: newImageUrl
        });

        const anymarketUploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
          method: 'POST',
          headers: {
            'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
            'Content-Type': 'application/json',
            'User-Agent': 'Meli-Integration/1.0',
            'Accept': 'application/json'
          },
          body: JSON.stringify(anymarketUploadData)
        });

        if (!anymarketUploadResponse.ok) {
          const errorText = await anymarketUploadResponse.text();
          console.error(`❌ Erro no upload para Anymarket:`, {
            status: anymarketUploadResponse.status,
            statusText: anymarketUploadResponse.statusText,
            error: errorText,
            data: anymarketUploadData
          });
          throw new Error(`Erro no upload para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`);
        }

        const anymarketResult = await anymarketUploadResponse.json();
        console.log(`✅ Nova imagem enviada para Anymarket:`, {
          newImageId: anymarketResult.id,
          url: newImageUrl,
          index: anymarketUploadData.index,
          main: anymarketUploadData.main
        });

        results.push({
          imageId: image.id,
          newImageId: anymarketResult.id,
          variation: image.variation || 'Sem variação',
          index: i, // Posição sequencial: 0, 1, 2, 3...
          main: i === 0, // true apenas para a primeira imagem
          originalUrl: image.originalImage,
          newUrl: newImageUrl,
          croppedBase64: croppedImageBase64,
          fileName: fileName,
          success: true,
          uploadedToAnymarket: true,
          anymarketResponse: anymarketResult,
          processingSteps: {
            pixianProcessed: true,
            serverUploaded: true,
            oldImageDeleted: deleteResponse.ok,
            newImageUploaded: true
          }
        });

      } catch (error: any) {
        console.error(`❌ Erro ao processar imagem ${image.id}:`, error);
        errors.push({
          imageId: image.id,
          variation: image.variation || 'Sem variação',
          error: error.message
        });
      }

      // Pequena pausa entre processamentos
      if (i < originalImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // ETAPA 2: Processar imagens dos SKUs da VTEX
    console.log('🔄 ETAPA 2: Processando imagens dos SKUs da VTEX...');
    
    let skuResults = [];
    let skuErrors = [];
    
    try {
      // Buscar imagens dos SKUs da VTEX
      const { executeQuery } = await import('@/lib/database');
      const skuImages = await executeQuery(`
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

      console.log(`📸 Encontradas ${skuImages.length} imagens dos SKUs da VTEX`);

      // Processar cada imagem da VTEX
      for (let i = 0; i < skuImages.length; i++) {
        const skuImage = skuImages[i];
        console.log(`🎨 Processando imagem VTEX ${i + 1}/${skuImages.length}: ${skuImage.id}`);

        try {
          // Construir URL da imagem VTEX
          const vtexImageUrl = `https://projetoinfluencer.${skuImage.file_location}`;
          console.log('🔗 URL da imagem VTEX:', vtexImageUrl);

          // Processar no Pixian.ai usando JSON (formato curl)
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
          console.log('✅ Imagem VTEX processada no Pixian');

          // Salvar imagem processada no servidor
          const fileName = `vtex_${skuImage.id}_${Date.now()}.jpg`;
          const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');
          
          const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload-image`, {
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
            throw new Error('Erro ao fazer upload da imagem VTEX para o servidor');
          }

          const uploadResult = await uploadResponse.json();
          const newImageUrl = uploadResult.data.publicUrl;
          console.log('📤 Imagem VTEX salva no servidor:', newImageUrl);

          // Enviar para o Anymarket (usando URL)
          // Continuar a sequência de índices das imagens do Anymarket
          const totalAnymarketImages = originalImages.length;
          const anymarketUploadData = {
            index: totalAnymarketImages + i, // Continuar sequência: se Anymarket tinha 2 imagens (0,1), VTEX começa em 2,3,4...
            main: false, // Imagens VTEX nunca são main (apenas a primeira do Anymarket é main)
            url: newImageUrl
          };

          const anymarketUploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
            method: 'POST',
            headers: {
              'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
              'Content-Type': 'application/json',
              'User-Agent': 'Meli-Integration/1.0',
              'Accept': 'application/json'
            },
            body: JSON.stringify(anymarketUploadData)
          });

          if (!anymarketUploadResponse.ok) {
            const errorText = await anymarketUploadResponse.text();
            throw new Error(`Erro no upload VTEX para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`);
          }

          const anymarketResult = await anymarketUploadResponse.json();
          console.log(`✅ Imagem VTEX enviada para Anymarket:`, {
            newImageId: anymarketResult.id,
            skuId: skuImage.sku_id,
            skuName: skuImage.sku_name
          });

          skuResults.push({
            imageId: skuImage.id,
            skuId: skuImage.sku_id,
            skuName: skuImage.sku_name,
            newImageId: anymarketResult.id,
            index: totalAnymarketImages + i, // Continuar sequência das imagens do Anymarket
            main: false, // Imagens VTEX nunca são main
            originalUrl: vtexImageUrl,
            newUrl: newImageUrl,
            croppedBase64: croppedImageBase64,
            fileName: fileName,
            success: true,
            uploadedToAnymarket: true,
            source: 'VTEX_SKU'
          });

        } catch (error: any) {
          console.error(`❌ Erro ao processar imagem VTEX ${skuImage.id}:`, error);
          skuErrors.push({
            imageId: skuImage.id,
            skuId: skuImage.sku_id,
            skuName: skuImage.sku_name,
            error: error.message,
            source: 'VTEX_SKU'
          });
        }

        // Pausa entre processamentos
        if (i < skuImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (error: any) {
      console.error('❌ Erro na etapa 2 (SKUs VTEX):', error);
      skuErrors.push({
        error: error.message,
        source: 'VTEX_SKU_FETCH'
      });
    }

    // Calcular estatísticas finais
    const totalProcessed = results.length + skuResults.length;
    const totalErrors = errors.length + skuErrors.length;
    const successfulUploads = results.filter(r => r.uploadedToAnymarket).length + skuResults.filter(r => r.uploadedToAnymarket).length;
    const successfulDeletions = results.filter(r => r.processingSteps?.oldImageDeleted).length;
    
    console.log(`📊 Estatísticas finais:`, {
      anymarketImages: originalImages.length,
      vtexImages: skuResults.length,
      totalProcessed,
      successfulUploads,
      successfulDeletions,
      totalErrors
    });

    return NextResponse.json({
      success: true,
      message: `${totalProcessed} imagens processadas e enviadas para o Anymarket com sucesso`,
      data: {
        // Etapa 1: Imagens do Anymarket
        anymarketImages: {
          total: originalImages.length,
          processed: results.length,
          successfulUploads: results.filter(r => r.uploadedToAnymarket).length,
          successfulDeletions,
          errors: errors.length,
          results,
          errorDetails: errors
        },
        // Etapa 2: Imagens dos SKUs da VTEX
        vtexImages: {
          total: skuResults.length + skuErrors.length,
          processed: skuResults.length,
          successfulUploads: skuResults.filter(r => r.uploadedToAnymarket).length,
          errors: skuErrors.length,
          results: skuResults,
          errorDetails: skuErrors
        },
        // Estatísticas gerais
        totalImages: originalImages.length + (skuResults.length + skuErrors.length),
        totalProcessed,
        totalErrors,
        successfulUploads,
        successfulDeletions,
        statistics: {
          anymarketProcessed: results.length,
          vtexProcessed: skuResults.length,
          totalPixianProcessed: totalProcessed,
          totalServerUploaded: totalProcessed,
          totalAnymarketUploaded: successfulUploads,
          oldImagesDeleted: successfulDeletions,
          successRate: `${((totalProcessed / (originalImages.length + (skuResults.length + skuErrors.length))) * 100).toFixed(1)}%`
        },
        note: 'Processo completo: Imagens do Anymarket + SKUs da VTEX processadas com Pixian.ai e enviadas para o Anymarket.'
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
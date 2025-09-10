import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { anymarketId, productId } = await request.json();

    if (!anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId é obrigatório'
      }, { status: 400 });
    }

    console.log('🗑️ Iniciando deleção de imagens do Anymarket para produto:', anymarketId);

    // 1. Buscar todas as imagens do Anymarket
    console.log('🔍 Buscando imagens do Anymarket...');
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

    let anymarketImages = [];
    const deletionResults = [];
    const deletionErrors = [];

    if (anymarketResponse.ok) {
      anymarketImages = await anymarketResponse.json();
      console.log(`📊 Encontradas ${anymarketImages.length} imagens no Anymarket para deletar`);
    } else {
      console.log('⚠️ Erro ao buscar imagens do Anymarket ou produto não encontrado, continuando para listar SKUs...');
    }

    // Se não há imagens no Anymarket, pular para a segunda parte
    if (anymarketImages.length === 0) {
      console.log('ℹ️ Nenhuma imagem encontrada no Anymarket, pulando para listar URLs dos SKUs...');
    }

    // 2. Deletar cada imagem (apenas se houver imagens)
    if (anymarketImages.length > 0) {
      console.log('🗑️ Iniciando deleção das imagens do Anymarket...');
      
      for (const image of anymarketImages) {
        try {
          console.log(`🗑️ Deletando imagem ${image.id}...`);
          
          const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images/${image.id}`, {
            method: 'DELETE',
            headers: {
              'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg==',
              'Content-Type': 'application/json',
              'User-Agent': 'Meli-Integration/1.0'
            }
          });

          if (deleteResponse.ok) {
            console.log(`✅ Imagem ${image.id} deletada com sucesso`);
            deletionResults.push({
              imageId: image.id,
              success: true
            });
          } else {
            const errorText = await deleteResponse.text();
            console.warn(`⚠️ Erro ao deletar imagem ${image.id}: ${deleteResponse.status} - ${errorText}`);
            deletionErrors.push({
              imageId: image.id,
              error: `HTTP ${deleteResponse.status}: ${errorText}`,
              success: false
            });
          }
        } catch (deleteError: any) {
          console.error(`❌ Erro ao deletar imagem ${image.id}:`, deleteError);
          deletionErrors.push({
            imageId: image.id,
            error: deleteError.message,
            success: false
          });
        }
      }

      console.log(`✅ Deleção concluída: ${deletionResults.length} imagens deletadas, ${deletionErrors.length} erros`);
    } else {
      console.log('ℹ️ Nenhuma imagem para deletar no Anymarket');
    }

    // 3. Listar URLs das fotos dos SKUs (se productId foi fornecido)
    let skuImages = [];
    if (productId) {
      console.log('📸 Buscando URLs das imagens dos SKUs...');
      try {
        skuImages = await executeQuery(`
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

        // Construir URLs completas das imagens
        skuImages = skuImages.map(image => ({
          ...image,
          full_url: `https://projetoinfluencer.${image.file_location}`,
          vtex_url: `https://projetoinfluencer.vteximg.com.br/arquivos/ids/${image.id}`
        }));

        console.log(`✅ ${skuImages.length} imagens dos SKUs encontradas`);

        // 4. Processar cada imagem no Pixian com rate limiting
        console.log('🎨 Iniciando processamento no Pixian com rate limiting...');
        const processedImages: any[] = [];
        const processingErrors: any[] = [];
        
        // Configurações de rate limiting
        const maxConcurrentThreads = 3; // Começar com 3 threads (conservador)
        const delayBetweenBatches = 5000; // 5 segundos entre batches
        let backoffMultiplier = 1; // Multiplicador de backoff
        const baseBackoffDelay = 5000; // 5 segundos base

        // Função para processar uma imagem com retry e backoff
        const processImageWithBackoff = async (image: any, retryCount = 0): Promise<any> => {
          try {
            console.log(`🎨 Processando imagem ${image.id} (tentativa ${retryCount + 1})...`);

            // Preparar dados para o Pixian usando JSON (formato curl)
            const pixianData = {
              image: {
                url: image.full_url
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

            // Fazer requisição para o Pixian
            const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
              method: 'POST',
              headers: {
                'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(pixianData)
            });

            if (pixianResponse.status === 429) {
              // Rate limit atingido - aplicar backoff
              const backoffDelay = baseBackoffDelay * (retryCount + 1);
              console.log(`⏳ Rate limit atingido. Aguardando ${backoffDelay}ms antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              return processImageWithBackoff(image, retryCount + 1);
            }

            if (!pixianResponse.ok) {
              const errorText = await pixianResponse.text();
              throw new Error(`Erro no Pixian: ${pixianResponse.status} - ${errorText}`);
            }

            const croppedImageBuffer = await pixianResponse.arrayBuffer();
            const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');

            console.log(`✅ Imagem ${image.id} processada no Pixian`);

            // Reset do backoff após sucesso
            backoffMultiplier = 1;

            return {
              ...image,
              cropped_base64: `data:image/jpeg;base64,${croppedImageBase64}`,
              cropped_size: croppedImageBuffer.byteLength,
              processing_success: true
            };

          } catch (processingError: any) {
            if (retryCount < 3) { // Máximo 3 tentativas
              console.log(`⚠️ Erro na tentativa ${retryCount + 1} para imagem ${image.id}, tentando novamente...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre tentativas
              return processImageWithBackoff(image, retryCount + 1);
            }
            
            console.error(`❌ Erro final ao processar imagem ${image.id}:`, processingError);
            throw processingError;
          }
        };

        // Processar imagens em batches com delay
        for (let i = 0; i < skuImages.length; i += maxConcurrentThreads) {
          const batch = skuImages.slice(i, i + maxConcurrentThreads);
          console.log(`🔄 Processando batch ${Math.floor(i / maxConcurrentThreads) + 1}/${Math.ceil(skuImages.length / maxConcurrentThreads)} (${batch.length} imagens)...`);

          // Processar batch em paralelo
          const batchPromises = batch.map(image => 
            processImageWithBackoff(image).catch(error => ({
              ...image,
              error: error.message,
              processing_success: false
            }))
          );

          const batchResults = await Promise.all(batchPromises);

          // Separar sucessos e erros
          batchResults.forEach(result => {
            if (result.processing_success) {
              processedImages.push(result);
            } else {
              processingErrors.push({
                imageId: result.id,
                error: result.error,
                processing_success: false
              });
            }
          });

          // Delay entre batches (exceto no último batch)
          if (i + maxConcurrentThreads < skuImages.length) {
            console.log(`⏳ Aguardando ${delayBetweenBatches}ms antes do próximo batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }

        console.log(`✅ Processamento no Pixian concluído: ${processedImages.length} sucessos, ${processingErrors.length} erros`);

        // Atualizar skuImages com os resultados do processamento
        skuImages = processedImages;
      } catch (skuError: any) {
        console.error('❌ Erro ao buscar imagens dos SKUs:', skuError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processo concluído: ${deletionResults.length} imagens deletadas, ${skuImages.length} imagens processadas no Pixian`,
      data: {
        deletion: {
          total: anymarketImages.length,
          deleted: deletionResults.length,
          errorCount: deletionErrors.length,
          results: deletionResults,
          errorDetails: deletionErrors
        },
        skuImages: {
          total: skuImages.length,
          processed: skuImages.filter(img => img.processing_success).length,
          errors: skuImages.filter(img => !img.processing_success).length,
          images: skuImages
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno na deleção:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno na deleção',
      error: error.message
    }, { status: 500 });
  }
}
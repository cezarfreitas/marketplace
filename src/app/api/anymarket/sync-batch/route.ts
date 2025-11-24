import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';
import { detectGenderWithFallback } from '@/lib/gender-mapper';

/**
 * Converte texto puro em HTML formatado para a Anymarket
 */
function convertTextToHtml(text: string): string {
  if (!text) return text;
  
  // Se já contém HTML, retorna como está
  if (text.includes('<')) return text;
  
  // Dividir em seções baseado nos títulos em maiúsculo
  const sections = text.split(/([A-Z][A-Z\s]+[A-Z])/);
  let html = '';
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    if (!section) continue;
    
    // Se é um título em maiúsculo (seção)
    if (section.match(/^[A-Z][A-Z\s]+[A-Z]$/)) {
      html += `<b>${section}</b><br>`;
    } else {
      // Processar o conteúdo da seção
      let content = section;
      
      // Converter quebras de linha duplas em <br><br>
      content = content.replace(/\n\n/g, '<br><br>');
      
      // Converter quebras de linha simples em <br>
      content = content.replace(/\n/g, '<br>');
      
      // Converter perguntas em negrito (PERGUNTA:)
      content = content.replace(/(PERGUNTA:\s*[^<]+)/g, '<b>$1</b>');
      
      // Converter respostas (Resposta:)
      content = content.replace(/(Resposta:\s*[^<]+)/g, '<b>$1</b>');
      
      html += content + '<br><br>';
    }
  }
  
  // Limpar <br> extras no final
  html = html.replace(/(<br>)+$/, '');
  
  return html;
}

// Função auxiliar para salvar logs de sincronização
async function saveSyncLog(productId: number, anymarketId: string, title: string, description: string, success: boolean, responseData: any, errorMessage?: string, syncType: string = 'product', action: string = 'create') {
  try {
    const logQuery = `
      INSERT INTO anymarket_sync_logs (product_id, anymarket_id, title, description, success, response_data, error_message, sync_type, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await executeQuery(logQuery, [
      productId,
      anymarketId,
      title,
      description,
      success ? 1 : 0,
      JSON.stringify(responseData),
      errorMessage || null,
      syncType,
      action
    ]);

    console.log('📝 Log de sincronização salvo no banco de dados');
  } catch (logError) {
    console.log('⚠️ Erro ao salvar log (não crítico):', logError);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de productIds é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando sincronização em lote com Anymarket para ${productIds.length} produtos`);

    const results = {
      total: productIds.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Processar cada produto
    for (const productId of productIds) {
      try {
        console.log(`🔄 Processando produto ID: ${productId}`);

        // 1. Buscar dados do produto
        const productQuery = `
          SELECT 
            p.*,
            b.name as brand_name,
            c.name as category_name,
            a.id_produto_any as anymarket_id
          FROM products_vtex p
          LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
          LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
          LEFT JOIN (
            SELECT DISTINCT ref_produto_vtex, id_produto_any
            FROM anymarket
          ) a ON p.ref_produto = a.ref_produto_vtex
          WHERE p.id_produto_vtex = ?
        `;

        const products = await executeQuery(productQuery, [productId]);
        
        if (products.length === 0) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não encontrado'
          });
          continue;
        }

        const product = products[0];

        if (!product.anymarket_id) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui ID_ANY vinculado ao Anymarket'
          });
          continue;
        }

        // 2. Buscar título e descrição das tabelas titles e descriptions
        const titleDescriptionQuery = `
          SELECT 
            t.title,
            d.description
          FROM products_vtex p
          LEFT JOIN titles t ON p.id = t.product_id 
          LEFT JOIN descriptions d ON p.id = d.product_id 
          WHERE p.id = ?
        `;

        const titleDescriptionData = await executeQuery(titleDescriptionQuery, [productId]);
        
        if (titleDescriptionData.length === 0) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui título e descrição gerados'
          });
          continue;
        }

        const { title, description } = titleDescriptionData[0];
        
        if (!title) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui título otimizado gerado'
          });
          continue;
        }

        if (!description) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui descrição gerada'
          });
          continue;
        }

        // Converter descrição de texto puro para HTML se necessário
        let formattedDescription = description;
        if (description && !description.includes('<')) {
          console.log(`🔄 Convertendo descrição de texto puro para HTML - Produto ${productId}...`);
          formattedDescription = convertTextToHtml(description);
          console.log(`✅ Descrição convertida para HTML - Produto ${productId}`);
        }

        console.log(`📋 Dados encontrados - Produto ${productId}:`, {
          product_id: productId,
          title: title?.substring(0, 50) + '...',
          description_length: formattedDescription?.length || 0
        });

        // 3. Buscar características da tabela respostas_caracteristicas
        const characteristicsQuery = `
          SELECT caracteristica, resposta 
          FROM respostas_caracteristicas 
          WHERE produto_id = ?
        `;
        
        const characteristicsData = await executeQuery(characteristicsQuery, [productId]);
        console.log(`📋 Características encontradas - Produto ${productId}:`, characteristicsData.length);

        // 4. Preparar dados para envio ao Anymarket
        const characteristics: any[] = [];
        let modelValue = null;
        let genderCharacteristicValue = null; // Valor das características para fallback
        let warrantyTimeValue = null;
        let warrantyTextValue = null;
        let heightValue = null;
        let widthValue = null;
        let weightValue = null;
        let lengthValue = null;
        let videoUrlValue = null;
        
        // Adicionar características da tabela respostas_caracteristicas
        characteristicsData.forEach(char => {
          if (char.caracteristica && char.resposta) {
            characteristics.push({
              name: char.caracteristica,
              value: char.resposta
            });
            
            // Extrair valores específicos para model e gender
            if (char.caracteristica.toLowerCase().includes('modelo')) {
              modelValue = char.resposta;
            }
            if (char.caracteristica.toLowerCase().includes('gênero') || char.caracteristica.toLowerCase().includes('genero')) {
              // Armazenar valor da característica para usar como fallback
              genderCharacteristicValue = char.resposta;
            }
            
            // Extrair valores específicos para garantia
            if (char.caracteristica.toLowerCase().includes('tempo de garantia') || char.caracteristica.toLowerCase().includes('warranty time')) {
              // Tentar extrair número da resposta (ex: "12 meses", "1 ano", "24")
              const timeMatch = char.resposta.match(/(\d+)/);
              if (timeMatch) {
                warrantyTimeValue = parseInt(timeMatch[1]);
              }
            }
            if (char.caracteristica.toLowerCase().includes('garantia') || char.caracteristica.toLowerCase().includes('warranty')) {
              warrantyTextValue = char.resposta;
            }
            
            // Extrair valores específicos para dimensões e peso
            if (char.caracteristica.toLowerCase().includes('altura') || char.caracteristica.toLowerCase().includes('height')) {
              const heightMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
              if (heightMatch) {
                heightValue = parseFloat(heightMatch[1]);
              }
            }
            if (char.caracteristica.toLowerCase().includes('largura') || char.caracteristica.toLowerCase().includes('width')) {
              const widthMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
              if (widthMatch) {
                widthValue = parseFloat(widthMatch[1]);
              }
            }
            if (char.caracteristica.toLowerCase().includes('peso') || char.caracteristica.toLowerCase().includes('weight')) {
              const weightMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
              if (weightMatch) {
                weightValue = parseFloat(weightMatch[1]);
              }
            }
            if (char.caracteristica.toLowerCase().includes('comprimento') || char.caracteristica.toLowerCase().includes('length')) {
              const lengthMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
              if (lengthMatch) {
                lengthValue = parseFloat(lengthMatch[1]);
              }
            }
            
            // Extrair URL do vídeo
            if (char.caracteristica.toLowerCase().includes('vídeo') || char.caracteristica.toLowerCase().includes('video') || char.caracteristica.toLowerCase().includes('url')) {
              // Verificar se é uma URL válida
              if (char.resposta.includes('http') || char.resposta.includes('www.')) {
                videoUrlValue = char.resposta;
              }
            }
          }
        });
        
        // Detectar gênero inteligentemente: primeiro pelo título, depois pelas características
        console.log(`🔍 Detectando gênero do produto ${productId}...`);
        console.log(`📝 Título: ${title}`);
        console.log(`📝 Característica de gênero: ${genderCharacteristicValue || 'não encontrada'}`);
        const genderValue = detectGenderWithFallback(title, genderCharacteristicValue || undefined);
        console.log(`✅ Gênero detectado para produto ${productId}:`, genderValue);
        
        // Preparar payload base
        const anymarketPayload: any = {
          title: title,
          description: formattedDescription,
          characteristics: characteristics
        };

        // Adicionar campos model e gender
        if (modelValue) {
          anymarketPayload.model = modelValue;
        }
        
        // Sempre adicionar gender (já detectado com fallback para UNISSEX)
        anymarketPayload.gender = genderValue;
        
        // Adicionar campos de garantia se disponíveis
        if (warrantyTimeValue !== null) {
          anymarketPayload.warrantyTime = warrantyTimeValue;
        }
        
        if (warrantyTextValue) {
          anymarketPayload.warrantyText = warrantyTextValue;
        }
        
        // Adicionar campos de dimensões e peso se disponíveis
        if (heightValue !== null) {
          anymarketPayload.height = heightValue;
        }
        
        if (widthValue !== null) {
          anymarketPayload.width = widthValue;
        }
        
        if (weightValue !== null) {
          anymarketPayload.weight = weightValue;
        }
        
        if (lengthValue !== null) {
          anymarketPayload.length = lengthValue;
        }
        
        // Adicionar URL do vídeo se disponível
        if (videoUrlValue) {
          anymarketPayload.videoUrl = videoUrlValue;
        }
        
        // Adicionar campos padrão do Anymarket
        anymarketPayload.calculatedPrice = true;
        anymarketPayload.hasVariations = true;
        anymarketPayload.isProductActive = true;

        console.log(`📤 Enviando dados para Anymarket - Produto ${productId}:`, {
          anymarket_id: product.anymarket_id,
          title: title?.substring(0, 50) + '...',
          description_length: formattedDescription?.length || 0,
          characteristics_count: characteristics.length,
          characteristics: characteristics.map(c => `${c.name}: ${c.value}`),
          model: modelValue || 'não informado',
          gender: genderValue,
          warrantyTime: warrantyTimeValue || 'não informado',
          warrantyText: warrantyTextValue || 'não informado',
          height: heightValue || 'não informado',
          width: widthValue || 'não informado',
          weight: weightValue || 'não informado',
          length: lengthValue || 'não informado',
          videoUrl: videoUrlValue || 'não informado'
        });

        // 4. Fazer PATCH para o Anymarket
        console.log('🌐 Fazendo requisição para Anymarket API...');
        console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
        
        let anymarketResponse;
        try {
          anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
            method: 'PATCH',
            headers: {
              'gumgaToken': process.env.ANYMARKET || '',
              'Content-Type': 'application/merge-patch+json',
              'User-Agent': 'Meli-Integration/1.0',
              'Accept': 'application/json'
            },
            body: JSON.stringify(anymarketPayload),
            cache: 'no-store',
            next: { revalidate: 0 }
          });
          
          console.log('📡 Resposta recebida da API Anymarket:', {
            status: anymarketResponse.status,
            statusText: anymarketResponse.statusText,
            ok: anymarketResponse.ok
          });
          
        } catch (fetchError: any) {
          console.error('❌ Erro de conexão com Anymarket:', fetchError);
          
          // Salvar log de erro de conexão
          await saveSyncLog(productId, product.anymarket_id, title, formattedDescription, false, null, `Erro de conexão: ${fetchError.message}`);
          
          results.failed++;
          results.errors.push({
            productId,
            error: `Erro de conexão: ${fetchError.message}`,
            type: 'CONNECTION_ERROR'
          });
          continue;
        }

        const anymarketResult = await anymarketResponse.json();

        if (!anymarketResponse.ok) {
          console.error(`❌ Erro na API do Anymarket para produto ${productId}:`, anymarketResult);
          
          // Salvar log de erro
          await saveSyncLog(productId, product.anymarket_id, title, formattedDescription, false, anymarketResult, anymarketResult.message || 'Erro desconhecido');
          
          results.failed++;
          results.errors.push({
            productId,
            error: 'Erro ao sincronizar com Anymarket: ' + (anymarketResult.message || 'Erro desconhecido'),
            anymarket_id: product.anymarket_id
          });
          continue;
        }

        console.log(`✅ Sincronização com Anymarket realizada com sucesso para produto ${productId}!`);

        // 5. Atualizar enviado_any na tabela anymarket (removido data_sincronizacao)
        try {
          await executeQuery(`
            UPDATE anymarket 
            SET enviado_any = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP 
            WHERE ref_produto_vtex = ?
          `, [product.ref_id]);
          console.log(`📅 Data de envio atualizada para produto ${productId}`);
        } catch (updateError) {
          console.error(`⚠️ Erro ao atualizar data de envio para produto ${productId} (não crítico):`, updateError);
        }

        // 6. Salvar log da sincronização
        await saveSyncLog(productId, product.anymarket_id, title, formattedDescription, true, anymarketResult);

        results.success++;

      } catch (error: any) {
        console.error(`❌ Erro ao processar produto ${productId}:`, error);
        results.failed++;
        results.errors.push({
          productId,
          error: error.message || 'Erro desconhecido'
        });
      }
    }

    console.log(`✅ Sincronização em lote concluída - Sucessos: ${results.success}, Falhas: ${results.failed}`);

    return NextResponse.json({
      success: true,
      message: `Sincronização em lote concluída! Sucessos: ${results.success}, Falhas: ${results.failed}`,
      data: results
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização em lote com Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor na sincronização em lote',
      error: error.message
    }, { status: 500 });
  }
}

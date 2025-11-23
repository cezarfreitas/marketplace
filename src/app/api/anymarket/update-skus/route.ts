import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

/**
 * API para atualizar nomes dos SKUs no Anymarket
 * 
 * PROCESSO:
 * 1. Buscar título gerado da tabela titles
 * 2. Buscar SKUs atuais do produto no Anymarket
 * 3. Atualizar cada SKU com o novo nome baseado no título usando PATCH
 * 
 * PADRÃO DE NOMENCLATURA DOS SKUs:
 * - Formato: "[Título do Produto] - [Tamanho]"
 * - Exemplo: "Camiseta NFL Preta Mescla Masculina Las Vegas Raiders - P"
 * 
 * MÉTODO:
 * - Usa PATCH com application/merge-patch+json para atualizar apenas o campo title
 * - Mais eficiente que PUT pois não precisa enviar todos os campos do SKU
 */

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando atualização de nomes dos SKUs...');
    console.log('📋 Product ID:', productId, 'Anymarket ID:', anymarketId);

    // 1. Buscar título gerado
    const titleQuery = `
      SELECT title 
      FROM titles 
      WHERE id_product_vtex = ? 
        AND status = 'validated' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const titleResult = await executeQuery(titleQuery, [productId]);
    
    if (!titleResult || titleResult.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum título gerado encontrado para este produto'
      }, { status: 404 });
    }
    
    const newTitle = titleResult[0].title;
    console.log('📝 Título encontrado:', newTitle);

    // 2. Buscar SKUs da tabela VTEX para obter os nomes originais
    console.log('🔍 Buscando SKUs da tabela VTEX...');
    const vtexSkusQuery = `
      SELECT id_sku_vtex, name, ref_sku 
      FROM skus_vtex 
      WHERE id_produto_vtex = ?
    `;
    
    const vtexSkus = await executeQuery(vtexSkusQuery, [productId]);
    console.log('📊 SKUs VTEX encontrados:', vtexSkus.length);
    
    // Criar mapeamento de ref_sku para nome original (para extrair tamanho)
    const refSkuToOriginalName: Record<string, string> = {};
    const skuIdToOriginalName: Record<string, string> = {};
    vtexSkus.forEach((vtexSku: any) => {
      if (vtexSku.name) {
        // Mapear por ref_sku
        if (vtexSku.ref_sku) {
          refSkuToOriginalName[vtexSku.ref_sku] = vtexSku.name;
          console.log(`📋 Mapeamento ref_sku: ${vtexSku.ref_sku} → ${vtexSku.name}`);
        }
        // Mapear também por id_sku_vtex
        if (vtexSku.id_sku_vtex) {
          skuIdToOriginalName[vtexSku.id_sku_vtex.toString()] = vtexSku.name;
          console.log(`📋 Mapeamento id_sku: ${vtexSku.id_sku_vtex} → ${vtexSku.name}`);
        }
      }
    });

    // 3. Buscar SKUs atuais do produto no Anymarket
    console.log('🔍 Buscando SKUs atuais do produto no Anymarket...');
    const skusUrl = `https://api.anymarket.com.br/v2/products/${anymarketId}/skus`;
    
    const skusResponse = await fetch(skusUrl, {
      method: 'GET',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!skusResponse.ok) {
      const errorData = await skusResponse.json();
      console.error('❌ Erro ao buscar SKUs:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar SKUs do produto: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: skusResponse.status });
    }

    const skusData = await skusResponse.json();
    console.log('✅ SKUs obtidos:', skusData.length, 'SKUs encontrados');

    if (!skusData || skusData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum SKU encontrado para atualizar',
        data: {
          anymarket_id: anymarketId,
          skus_updated: 0,
          skus_total: 0
        }
      });
    }

    // 4. Atualizar cada SKU
    const updateResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const sku of skusData) {
      try {
        const currentTitle = sku.title || '';
        
        // Extrair tamanho do nome original do SKU (VTEX)
        let size = 'Único';
        let originalName = null;
        
        // Tentar encontrar o nome original por diferentes identificadores
        const skuPartnerId = sku.partnerId; // ID do SKU na VTEX
        const skuId = sku.id?.toString();
        
        // Prioridade 1: Buscar por partnerId (ref_sku)
        if (skuPartnerId && refSkuToOriginalName[skuPartnerId]) {
          originalName = refSkuToOriginalName[skuPartnerId];
          console.log(`📋 SKU ${sku.id} - Nome original VTEX (via partnerId): "${originalName}"`);
        }
        // Prioridade 2: Buscar por id_sku_vtex
        else if (skuPartnerId && skuIdToOriginalName[skuPartnerId]) {
          originalName = skuIdToOriginalName[skuPartnerId];
          console.log(`📋 SKU ${sku.id} - Nome original VTEX (via id_sku): "${originalName}"`);
        }
        
        if (originalName) {
          // Extrair tamanho após o último " - "
          const parts = originalName.split(' - ');
          if (parts.length > 1) {
            size = parts[parts.length - 1].trim();
            console.log(`✅ Tamanho extraído: "${size}"`);
          } else {
            // Se não houver " - ", tentar extrair dos últimos caracteres
            const last13Chars = originalName.slice(-13).trim();
            console.log(`📏 Últimos 13 caracteres: "${last13Chars}"`);
            size = last13Chars.replace(/^[^a-zA-Z0-9]+/, '').trim() || 'Único';
            console.log(`⚠️ Usando últimos caracteres como tamanho: "${size}"`);
          }
        } else {
          console.log(`⚠️ SKU ${sku.id} - partnerId: ${skuPartnerId} - Nome original não encontrado, usando "Único"`);
        }
        
        // Criar novo nome do SKU
        const newSkuTitle = `${newTitle} - ${size}`;
        
        console.log(`🔄 Atualizando SKU ${sku.id}:`);
        console.log(`   partnerId: ${skuPartnerId}`);
        console.log(`   Nome atual Anymarket: "${currentTitle}"`);
        console.log(`   Nome original VTEX: "${originalName || 'N/A'}"`);
        console.log(`   Novo nome: "${newSkuTitle}"`);

        // Preparar payload PATCH para atualização do SKU (apenas campos necessários)
        const skuUpdatePayload = {
          title: newSkuTitle
        };

        // Fazer PATCH para atualizar apenas o título do SKU
        const skuUpdateUrl = `https://api.anymarket.com.br/v2/products/${anymarketId}/skus/${sku.id}`;
        
        const skuUpdateResponse = await fetch(skuUpdateUrl, {
          method: 'PATCH',
          headers: {
            'gumgaToken': process.env.ANYMARKET || '',
            'Content-Type': 'application/merge-patch+json',
            'User-Agent': 'Meli-Integration/1.0',
            'Accept': 'application/json'
          },
          body: JSON.stringify(skuUpdatePayload),
          cache: 'no-store'
        });

        if (skuUpdateResponse.ok) {
          const updatedSku = await skuUpdateResponse.json();
          updateResults.push({
            sku_id: sku.id,
            partner_id: skuPartnerId,
            vtex_original_name: originalName || 'N/A',
            old_title: currentTitle,
            new_title: newSkuTitle,
            size: size,
            payload_sent: skuUpdatePayload,
            success: true
          });
          successCount++;
          console.log(`✅ SKU ${sku.id} atualizado com sucesso`);
        } else {
          const errorData = await skuUpdateResponse.json();
          updateResults.push({
            sku_id: sku.id,
            partner_id: skuPartnerId,
            vtex_original_name: originalName || 'N/A',
            old_title: currentTitle,
            new_title: newSkuTitle,
            size: size,
            payload_sent: skuUpdatePayload,
            success: false,
            error: errorData.message || 'Erro desconhecido'
          });
          errorCount++;
          console.error(`❌ Erro ao atualizar SKU ${sku.id}:`, errorData);
        }

        // Pequena pausa entre atualizações para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro ao processar SKU ${sku.id}:`, error);
        updateResults.push({
          sku_id: sku.id,
          partner_id: sku.partnerId || 'N/A',
          vtex_original_name: 'N/A',
          old_title: sku.title || '',
          new_title: '',
          size: 'N/A',
          payload_sent: null,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        errorCount++;
      }
    }

    // 4. Preparar resposta
    const responseMessage = `SKUs atualizados: ${successCount} sucessos, ${errorCount} erros de ${skusData.length} total`;
    console.log('📊 Resultado final:', responseMessage);

    return NextResponse.json({
      success: errorCount === 0, // Sucesso apenas se não houver erros
      message: responseMessage,
      data: {
        anymarket_id: anymarketId,
        product_title: newTitle,
        skus_total: skusData.length,
        skus_updated: successCount,
        skus_errors: errorCount,
        update_results: updateResults,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar SKUs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao atualizar SKUs',
      error: error.message
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

/**
 * API para sincronização em lote de produtos com o Anymarket
 * 
 * PROCESSO:
 * 1. Receber lista de productIds
 * 2. Para cada produto:
 *    - Buscar título e descrição gerados
 *    - Buscar características
 *    - Buscar ID do Anymarket
 *    - Atualizar produto no Anymarket
 *    - Atualizar nomes dos SKUs
 * 3. Retornar relatório de sucessos e erros
 */

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

    console.log('🔄 Iniciando sincronização em lote com Anymarket...');
    console.log('📋 Produtos para sincronizar:', productIds.length);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Processar cada produto
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      console.log(`\n🔄 Processando produto ${i + 1}/${productIds.length}: ${productId}`);

      try {
        // 1. Buscar dados do produto
        const productQuery = `
          SELECT 
            p.id_produto_vtex,
            p.name as product_name,
            a.id_produto_any as anymarket_id
          FROM products_vtex p
          LEFT JOIN anymarket a ON p.ref_produto = a.ref_produto_vtex
          WHERE p.id_produto_vtex = ?
        `;
        
        const productResult = await executeQuery(productQuery, [productId]);
        
        if (!productResult || productResult.length === 0) {
          results.push({
            productId,
            success: false,
            error: 'Produto não encontrado no banco de dados'
          });
          errorCount++;
          continue;
        }

        const product = productResult[0];

        if (!product.anymarket_id) {
          results.push({
            productId,
            success: false,
            error: 'Produto não possui ID do Anymarket vinculado'
          });
          errorCount++;
          continue;
        }

        // 2. Buscar título gerado
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
          results.push({
            productId,
            success: false,
            error: 'Nenhum título gerado encontrado para este produto'
          });
          errorCount++;
          continue;
        }

        const newTitle = titleResult[0].title;

        // 3. Buscar descrição gerada
        const descriptionQuery = `
          SELECT description 
          FROM descriptions 
          WHERE id_product_vtex = ? 
            AND status = 'generated' 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        const descriptionResult = await executeQuery(descriptionQuery, [productId]);
        let newDescription = null;
        
        if (descriptionResult && descriptionResult.length > 0) {
          newDescription = descriptionResult[0].description;
        }

        // 4. Buscar características
        const characteristicsQuery = `
          SELECT 
            rc.caracteristica,
            rc.resposta
          FROM respostas_caracteristicas rc
          WHERE rc.produto_id = ? 
            AND rc.resposta IS NOT NULL 
            AND rc.resposta != ''
            AND TRIM(rc.resposta) != ''
          ORDER BY rc.caracteristica ASC
        `;
        
        const characteristicsResult = await executeQuery(characteristicsQuery, [productId]);
        let productCharacteristics: any[] = [];
        
        if (characteristicsResult && characteristicsResult.length > 0) {
          productCharacteristics = characteristicsResult.map((char, index) => ({
            index: index + 1,
            name: char.caracteristica,
            value: char.resposta
          }));
        }

        // 5. Fazer requisição interna para atualizar produto
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'}/api/anymarket/update-product`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            anymarketId: product.anymarket_id
          })
        });

        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          results.push({
            productId,
            anymarketId: product.anymarket_id,
            productName: product.product_name,
            success: true,
            title: newTitle,
            descriptionLength: newDescription ? newDescription.length : 0,
            characteristicsCount: productCharacteristics.length,
            skuUpdate: updateResult.data?.sku_update,
            message: updateResult.message
          });
          successCount++;
          console.log(`✅ Produto ${productId} sincronizado com sucesso`);
        } else {
          const errorData = await updateResponse.json();
          results.push({
            productId,
            anymarketId: product.anymarket_id,
            productName: product.product_name,
            success: false,
            error: errorData.message || 'Erro ao atualizar produto no Anymarket'
          });
          errorCount++;
          console.error(`❌ Erro ao sincronizar produto ${productId}:`, errorData.message);
        }

        // Pequena pausa entre requisições para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Erro ao processar produto ${productId}:`, error);
        results.push({
          productId,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        errorCount++;
      }
    }

    // Preparar resposta final
    const responseMessage = `Sincronização em lote concluída: ${successCount} sucessos, ${errorCount} erros de ${productIds.length} produtos`;
    console.log('\n📊 Resultado final:', responseMessage);

    return NextResponse.json({
      success: errorCount === 0, // Sucesso apenas se não houver erros
      message: responseMessage,
      data: {
        total_products: productIds.length,
        success_count: successCount,
        error_count: errorCount,
        results: results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização em lote:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor na sincronização em lote',
      error: error.message
    }, { status: 500 });
  }
}


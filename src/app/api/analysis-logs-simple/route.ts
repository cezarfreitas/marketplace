import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '10');
    

    let logs;
    
    if (productId) {
      logs = await executeQuery(`
        SELECT 
          id_produto_vtex as product_id, 
          COALESCE((SELECT ref_produto FROM products_vtex WHERE id_produto_vtex = analise_imagens.id_produto_vtex), 'N/A') as product_ref_id,
          'image_analysis' as analysis_type, 
          openai_model as model_used, 
          openai_tokens_used as tokens_used, 
          openai_cost,
          1 as success, 
          created_at, 
          contextualizacao as contextual_analysis,
          product_type, 
          valid_images as image_count, 
          invalid_images as invalid_image_count, 
          analysis_quality,
          analysis_duration_ms, 
          openai_response_time_ms, 
          openai_max_tokens as max_tokens,
          COALESCE(agent_name, 'Agente de Imagens') as agent_name
        FROM analise_imagens
        WHERE id_produto_vtex = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `, [productId, limit.toString()]);

      // Buscar atributos do produto se existir análise
      if (logs && logs.length > 0) {
        const productAttributes = await executeQuery(`
          SELECT attribute_name, attribute_value
          FROM product_attributes_vtex
          WHERE id_product_vtex = ?
          ORDER BY attribute_name
        `, [productId]);

        // Adicionar atributos ao primeiro log (mais recente)
        if (logs.length > 0) {
          logs[0].product_attributes = productAttributes || [];
        }
      }
    } else {
      logs = await executeQuery(`
        SELECT 
          id_produto_vtex as product_id, 
          COALESCE((SELECT ref_produto FROM products_vtex WHERE id_produto_vtex = analise_imagens.id_produto_vtex), 'N/A') as product_ref_id,
          'image_analysis' as analysis_type, 
          openai_model as model_used, 
          openai_tokens_used as tokens_used, 
          openai_cost,
          1 as success, 
          created_at, 
          contextualizacao as contextual_analysis,
          product_type, 
          valid_images as image_count, 
          invalid_images as invalid_image_count, 
          analysis_quality,
          analysis_duration_ms, 
          openai_response_time_ms, 
          openai_max_tokens as max_tokens,
          COALESCE(agent_name, 'Agente de Imagens') as agent_name
        FROM analise_imagens
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit.toString()]);
    }


    return NextResponse.json({
      success: true,
      logs: logs
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs de análise:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

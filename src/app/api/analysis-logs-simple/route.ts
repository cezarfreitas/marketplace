import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 API simples de logs chamada');
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log('📋 Parâmetros:', { productId, limit });

    let logs;
    
    if (productId) {
      console.log('🔍 Buscando logs para produto:', productId);
      logs = await executeQuery(`
        SELECT 
          id_produto as product_id, 
          COALESCE((SELECT ref_id FROM products_vtex WHERE id = id_produto), 'N/A') as product_ref_id,
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
        WHERE id_produto = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `, [productId, limit.toString()]);
    } else {
      console.log('🔍 Buscando todos os logs');
      logs = await executeQuery(`
        SELECT 
          id_produto as product_id, 
          COALESCE((SELECT ref_id FROM products_vtex WHERE id = id_produto), 'N/A') as product_ref_id,
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

    console.log('✅ Query executada com sucesso');
    console.log('📊 Logs encontrados:', logs.length);

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

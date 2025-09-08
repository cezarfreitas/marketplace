import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
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
          id, product_id, product_ref_id, analysis_type, model_used, 
          tokens_used, success, created_at, analysis_text as contextual_analysis,
          product_type, valid_images as image_count, invalid_images as invalid_image_count, analysis_quality,
          analysis_duration_ms, openai_response_time_ms, max_tokens,
          'Agente de Imagens' as agent_name
        FROM image_analysis_logs
        WHERE product_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `, [productId, limit.toString()]);
    } else {
      console.log('🔍 Buscando todos os logs');
      logs = await executeQuery(`
        SELECT 
          id, product_id, product_ref_id, analysis_type, model_used, 
          tokens_used, success, created_at, analysis_text as contextual_analysis,
          product_type, valid_images as image_count, invalid_images as invalid_image_count, analysis_quality,
          analysis_duration_ms, openai_response_time_ms, max_tokens,
          'Agente de Imagens' as agent_name
        FROM image_analysis_logs
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

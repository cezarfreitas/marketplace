import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('🔍 Buscando log específico ID:', id);

    const logs = await executeQuery(`
      SELECT id, product_id, product_ref_id, analysis_type, model_used, 
             tokens_used, max_tokens, temperature, analysis_quality,
             total_images, valid_images, invalid_images, product_type,
             analysis_duration_ms, openai_response_time_ms, success,
             error_message, analysis_text, created_at
      FROM image_analysis_logs 
      WHERE id = ?
    `, [id]);

    if (logs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Log não encontrado'
      }, { status: 404 });
    }

    console.log('✅ Log encontrado:', logs[0].id);

    return NextResponse.json({
      success: true,
      log: logs[0]
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar log específico:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

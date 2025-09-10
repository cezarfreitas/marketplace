import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 API de logs chamada');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const productId = searchParams.get('productId');
    
    console.log('📋 Parâmetros:', { page, limit, productId });

    const offset = (page - 1) * limit;

    // Query simplificada primeiro
    let logs;
    let total = 0;
    
    if (productId) {
      console.log('🔍 Buscando logs para produto:', productId);
      logs = await executeQuery(`
        SELECT 
          l.*,
          p.name as product_name,
          p.title as product_title,
          p.ref_id as product_ref_id,
          a.name as agent_name,
          a.model as agent_model
        FROM image_analysis_logs l
        LEFT JOIN products p ON l.product_id = p.id
        LEFT JOIN agents a ON l.agent_id = a.id
        WHERE l.product_id = ?
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `, [productId, limit, offset]);
      
      const [countResult] = await executeQuery(`
        SELECT COUNT(*) as total
        FROM image_analysis_logs l
        WHERE l.product_id = ?
      `, [productId]);
      
      total = countResult.total;
    } else {
      console.log('🔍 Buscando todos os logs');
      logs = await executeQuery(`
        SELECT 
          l.*,
          p.name as product_name,
          p.title as product_title,
          p.ref_id as product_ref_id,
          a.name as agent_name,
          a.model as agent_model
        FROM image_analysis_logs l
        LEFT JOIN products p ON l.product_id = p.id
        LEFT JOIN agents a ON l.agent_id = a.id
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      const [countResult] = await executeQuery(`
        SELECT COUNT(*) as total
        FROM image_analysis_logs l
      `);
      
      total = countResult.total;
    }

    const totalPages = Math.ceil(total / limit);

    console.log('✅ Query executada com sucesso');
    console.log('📊 Logs encontrados:', logs.length);
    console.log('📊 Total:', total);

    return NextResponse.json({
      success: true,
      logs: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const olderThan = searchParams.get('olderThan'); // em dias

    if (id) {
      // Deletar log específico
      await executeQuery(`
        DELETE FROM image_analysis_logs WHERE id = ?
      `, [id]);

      return NextResponse.json({
        success: true,
        message: 'Log deletado com sucesso'
      });
    }

    if (olderThan) {
      // Deletar logs antigos
      const days = parseInt(olderThan);
      const result = await executeQuery(`
        DELETE FROM image_analysis_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]);

      return NextResponse.json({
        success: true,
        message: `${(result as any).affectedRows} logs antigos deletados`
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Parâmetro id ou olderThan é obrigatório'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Erro ao deletar logs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

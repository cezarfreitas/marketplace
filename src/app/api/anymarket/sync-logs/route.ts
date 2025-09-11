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

    if (productId) {
      // Buscar logs de sincronização de um produto específico
      console.log('🔍 Buscando logs de sincronização para produto ID:', productId);

      const logsQuery = `
        SELECT 
          l.*,
          p.name as product_name,
          p.ref_id as product_ref_id
        FROM anymarket_sync_logs l
        JOIN products_vtex p ON l.product_id = p.id
        WHERE l.product_id = ?
        ORDER BY l.created_at DESC
      `;

      const logs = await executeQuery(logsQuery, [productId]);
      
      console.log('📊 Logs encontrados:', logs.length);

      return NextResponse.json({
        success: true,
        data: logs
      });
    } else {
      // Buscar todos os logs de sincronização
      console.log('🔍 Buscando todos os logs de sincronização');

      const logsQuery = `
        SELECT 
          l.*,
          p.name as product_name,
          p.ref_id as product_ref_id
        FROM anymarket_sync_logs l
        JOIN products_vtex p ON l.product_id = p.id
        ORDER BY l.created_at DESC
      `;

      const logs = await executeQuery(logsQuery, []);
      
      console.log('📊 Total de logs encontrados:', logs.length);

      return NextResponse.json({
        success: true,
        data: logs
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs de sincronização:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar logs',
      error: error.message
    }, { status: 500 });
  }
}

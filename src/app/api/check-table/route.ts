import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Verificando estrutura da tabela anymarket_sync_logs...');
    
    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sync_logs'
    `);

    if (tableExists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela anymarket_sync_logs não existe'
      });
    }

    // Mostrar estrutura da tabela
    const structure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    
    // Verificar colunas específicas
    const columns = structure.map((col: any) => col.Field);
    const hasIdProdutoVtex = columns.includes('id_produto_vtex');
    const hasIdProdutoAny = columns.includes('id_produto_any');
    const hasProductId = columns.includes('product_id');
    const hasAnymarketId = columns.includes('anymarket_id');
    const hasSyncType = columns.includes('sync_type');

    return NextResponse.json({
      success: true,
      message: 'Estrutura da tabela anymarket_sync_logs verificada',
      data: {
        tableExists: true,
        structure: structure,
        columns: columns,
        columnCheck: {
          id_produto_vtex: hasIdProdutoVtex,
          id_produto_any: hasIdProdutoAny,
          product_id: hasProductId,
          anymarket_id: hasAnymarketId,
          sync_type: hasSyncType
        },
        needsCorrection: !hasIdProdutoVtex || !hasIdProdutoAny
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabela anymarket_sync_logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar tabela anymarket_sync_logs',
      error: error.message
    }, { status: 500 });
  }
}

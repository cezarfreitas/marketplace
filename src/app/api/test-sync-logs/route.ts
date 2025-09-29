import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Testando logs de sincronização...');

    // 1. Verificar se a tabela anymarket_sync_logs existe
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

    // 2. Verificar estrutura da tabela
    const structure = await executeQuery(`DESCRIBE anymarket_sync_logs`);

    // 3. Contar total de logs
    const totalLogs = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    // 4. Buscar logs recentes
    const recentLogs = await executeQuery(`
      SELECT 
        l.*,
        p.name as product_name,
        p.ref_produto as product_ref
      FROM anymarket_sync_logs l
      LEFT JOIN products_vtex p ON l.id_produto_vtex = p.id_produto_vtex
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    // 5. Estatísticas por erro (logs com error_message)
    const statsByError = await executeQuery(`
      SELECT 
        CASE 
          WHEN error_message IS NULL OR error_message = '' THEN 'success'
          ELSE 'error'
        END as status,
        COUNT(*) as count
      FROM anymarket_sync_logs
      GROUP BY status
    `);

    // 6. Estatísticas por tipo de sync
    const statsBySyncType = await executeQuery(`
      SELECT 
        COALESCE(sync_type, 'N/A') as sync_type,
        COUNT(*) as count
      FROM anymarket_sync_logs
      GROUP BY sync_type
    `);

    // 7. Estatísticas por ação
    const statsByAction = await executeQuery(`
      SELECT 
        COALESCE(action, 'N/A') as action,
        COUNT(*) as count
      FROM anymarket_sync_logs
      GROUP BY action
    `);

    return NextResponse.json({
      success: true,
      message: 'Logs de sincronização verificados com sucesso',
      data: {
        tableExists: true,
        structure: structure,
        columns: structure.length,
        totalLogs: totalLogs[0]?.total || 0,
        recentLogs: recentLogs,
        statistics: {
          byError: statsByError,
          bySyncType: statsBySyncType,
          byAction: statsByAction
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar logs de sincronização:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar logs de sincronização',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🧪 Criando log de teste...');

    // Criar um log de teste
    const testLogQuery = `
      INSERT INTO anymarket_sync_logs (id_produto_vtex, id_produto_any, title, description, response_data, error_message, sync_type, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const testData = {
      id_produto_vtex: 999999,
      id_produto_any: 'TEST_123',
      title: 'Produto de Teste',
      description: 'Descrição de teste para verificar logs',
      response_data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      error_message: null,
      sync_type: 'test',
      action: 'create'
    };

    await executeQuery(testLogQuery, [
      testData.id_produto_vtex,
      testData.id_produto_any,
      testData.title,
      testData.description,
      testData.response_data,
      testData.error_message,
      testData.sync_type,
      testData.action
    ]);

    console.log('✅ Log de teste criado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Log de teste criado com sucesso',
      testData: testData
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar log de teste:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar log de teste',
      error: error.message
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🗑️ Recriando tabela anymarket_sync_logs com estrutura limpa...');

    const results = [];

    // 1. Fazer backup dos dados existentes (se houver)
    console.log('📋 Fazendo backup dos dados existentes...');
    let backupData = [];
    try {
      const existingData = await executeQuery(`
        SELECT id_produto_vtex, id_produto_any, title, description, sync_type, action, created_at
        FROM anymarket_sync_logs
        WHERE id_produto_vtex IS NOT NULL
      `);
      backupData = existingData;
      results.push(`✅ Backup realizado: ${backupData.length} registros salvos`);
      console.log(`✅ Backup realizado: ${backupData.length} registros salvos`);
    } catch (error: any) {
      results.push(`⚠️ Erro no backup (continuando): ${error.message}`);
      console.log(`⚠️ Erro no backup (continuando): ${error.message}`);
    }

    // 2. Deletar tabela existente
    console.log('🗑️ Deletando tabela anymarket_sync_logs existente...');
    try {
      await executeQuery(`DROP TABLE IF EXISTS anymarket_sync_logs`);
      results.push('✅ Tabela anymarket_sync_logs deletada');
      console.log('✅ Tabela anymarket_sync_logs deletada');
    } catch (error: any) {
      results.push(`❌ Erro ao deletar tabela: ${error.message}`);
      console.error('❌ Erro ao deletar tabela:', error.message);
      throw error;
    }

    // 3. Criar nova tabela com estrutura limpa
    console.log('🆕 Criando nova tabela anymarket_sync_logs...');
    const createTableSQL = `
      CREATE TABLE anymarket_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_produto_vtex INT NOT NULL COMMENT 'ID do produto VTEX',
        id_produto_any VARCHAR(255) COMMENT 'ID do produto no Anymarket',
        title VARCHAR(500) COMMENT 'Título do produto',
        description TEXT COMMENT 'Descrição do produto',
        sync_type VARCHAR(50) DEFAULT 'info' COMMENT 'Tipo: info (informações), crop (recorte de imagens)',
        action VARCHAR(50) DEFAULT 'update' COMMENT 'Ação: create, update, delete',
        response_data JSON COMMENT 'Dados da resposta da API Anymarket',
        error_message TEXT COMMENT 'Mensagem de erro se houver',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Índices
        INDEX idx_id_produto_vtex (id_produto_vtex),
        INDEX idx_id_produto_any (id_produto_any),
        INDEX idx_sync_type (sync_type),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs de sincronização com Anymarket - estrutura limpa'
    `;

    try {
      await executeQuery(createTableSQL);
      results.push('✅ Nova tabela anymarket_sync_logs criada com sucesso');
      console.log('✅ Nova tabela anymarket_sync_logs criada com sucesso');
    } catch (error: any) {
      results.push(`❌ Erro ao criar tabela: ${error.message}`);
      console.error('❌ Erro ao criar tabela:', error.message);
      throw error;
    }

    // 4. Restaurar dados do backup (se houver)
    if (backupData.length > 0) {
      console.log(`🔄 Restaurando ${backupData.length} registros do backup...`);
      try {
        for (const record of backupData) {
          await executeQuery(`
            INSERT INTO anymarket_sync_logs (id_produto_vtex, id_produto_any, title, description, sync_type, action, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            record.id_produto_vtex,
            record.id_produto_any,
            record.title,
            record.description,
            record.sync_type || 'info',
            record.action || 'update',
            record.created_at
          ]);
        }
        results.push(`✅ ${backupData.length} registros restaurados do backup`);
        console.log(`✅ ${backupData.length} registros restaurados do backup`);
      } catch (error: any) {
        results.push(`⚠️ Erro ao restaurar backup: ${error.message}`);
        console.error('⚠️ Erro ao restaurar backup:', error.message);
      }
    }

    // 5. Verificar estrutura final
    console.log('🔍 Verificando estrutura final da tabela...');
    const finalStructure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    const columns = finalStructure.map((col: any) => col.Field);
    
    results.push({
      step: 'estrutura_final',
      columns: columns,
      structure: finalStructure
    });

    // 6. Contar registros
    const count = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);
    results.push({
      step: 'contagem',
      totalRecords: count[0]?.total || 0
    });

    console.log('✅ Recriação da tabela anymarket_sync_logs concluída');

    return NextResponse.json({
      success: true,
      message: 'Tabela anymarket_sync_logs recriada com sucesso',
      results: results,
      summary: {
        totalSteps: results.length,
        finalColumns: columns.length,
        totalRecords: count[0]?.total || 0,
        columns: columns
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao recriar tabela anymarket_sync_logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao recriar tabela anymarket_sync_logs',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela anymarket_sync_logs...');
    
    const structure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    const columns = structure.map((col: any) => col.Field);
    const count = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    return NextResponse.json({
      success: true,
      message: 'Estrutura da tabela anymarket_sync_logs verificada',
      data: {
        structure: structure,
        columns: columns,
        totalColumns: columns.length,
        totalRecords: count[0]?.total || 0,
        hasCorrectStructure: columns.includes('id_produto_vtex') && columns.includes('id_produto_any')
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

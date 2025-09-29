import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🔧 Atualizando tabelas anymarket...');

    const results = [];

    // 1. Remover coluna data_sincronizacao da tabela anymarket
    console.log('📝 Removendo coluna data_sincronizacao da tabela anymarket...');
    try {
      await executeQuery(`ALTER TABLE \`anymarket\` DROP COLUMN IF EXISTS \`data_sincronizacao\``);
      results.push('✅ Coluna data_sincronizacao removida da tabela anymarket');
      console.log('✅ Coluna data_sincronizacao removida da tabela anymarket');
    } catch (error: any) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        results.push('⚠️ Coluna data_sincronizacao não existe na tabela anymarket');
        console.log('⚠️ Coluna data_sincronizacao não existe na tabela anymarket');
      } else {
        results.push(`❌ Erro ao remover coluna data_sincronizacao: ${error.message}`);
        console.log('❌ Erro ao remover coluna data_sincronizacao:', error.message);
      }
    }

    // 2. Atualizar tabela anymarket_sync_logs
    console.log('📝 Atualizando tabela anymarket_sync_logs...');
    
    const columnsToAdd = [
      {
        name: 'sync_type',
        definition: 'varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT \'product\' COMMENT \'Tipo de sincronização: product, stock, image, price\''
      },
      {
        name: 'action',
        definition: 'varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT \'create\' COMMENT \'Ação: create, update, delete\''
      },
      {
        name: 'attempts',
        definition: 'int DEFAULT \'0\' COMMENT \'Número de tentativas de sincronização\''
      },
      {
        name: 'max_attempts',
        definition: 'int DEFAULT \'3\' COMMENT \'Número máximo de tentativas\''
      },
      {
        name: 'sync_duration_ms',
        definition: 'int DEFAULT NULL COMMENT \'Duração da sincronização em ms\''
      },
      {
        name: 'last_attempt_at',
        definition: 'timestamp NULL DEFAULT NULL COMMENT \'Data/hora da última tentativa\''
      },
      {
        name: 'synced_at',
        definition: 'timestamp NULL DEFAULT NULL COMMENT \'Data/hora da sincronização bem-sucedida\''
      }
    ];

    for (const column of columnsToAdd) {
      try {
        await executeQuery(`ALTER TABLE \`anymarket_sync_logs\` ADD COLUMN IF NOT EXISTS \`${column.name}\` ${column.definition}`);
        results.push(`✅ Coluna ${column.name} adicionada à tabela anymarket_sync_logs`);
        console.log(`✅ Coluna ${column.name} adicionada à tabela anymarket_sync_logs`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          results.push(`⚠️ Coluna ${column.name} já existe na tabela anymarket_sync_logs`);
          console.log(`⚠️ Coluna ${column.name} já existe na tabela anymarket_sync_logs`);
        } else {
          results.push(`❌ Erro ao adicionar coluna ${column.name}: ${error.message}`);
          console.log(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
        }
      }
    }

    // 3. Adicionar índices
    console.log('📝 Adicionando índices...');
    
    const indexesToAdd = [
      'idx_sync_type',
      'idx_action', 
      'idx_attempts',
      'idx_last_attempt_at',
      'idx_synced_at'
    ];

    for (const index of indexesToAdd) {
      try {
        const columnName = index.replace('idx_', '');
        await executeQuery(`ALTER TABLE \`anymarket_sync_logs\` ADD INDEX IF NOT EXISTS \`${index}\` (\`${columnName}\`)`);
        results.push(`✅ Índice ${index} adicionado à tabela anymarket_sync_logs`);
        console.log(`✅ Índice ${index} adicionado à tabela anymarket_sync_logs`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          results.push(`⚠️ Índice ${index} já existe na tabela anymarket_sync_logs`);
          console.log(`⚠️ Índice ${index} já existe na tabela anymarket_sync_logs`);
        } else {
          results.push(`❌ Erro ao adicionar índice ${index}: ${error.message}`);
          console.log(`❌ Erro ao adicionar índice ${index}:`, error.message);
        }
      }
    }

    // 4. Verificar estrutura das tabelas
    console.log('🔍 Verificando estrutura das tabelas...');
    
    const anymarketStructure = await executeQuery(`DESCRIBE anymarket`);
    const anymarketSyncLogsStructure = await executeQuery(`DESCRIBE anymarket_sync_logs`);

    // 5. Contar registros
    const anymarketCount = await executeQuery(`SELECT COUNT(*) as total FROM anymarket`);
    const anymarketSyncLogsCount = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    return NextResponse.json({
      success: true,
      message: 'Tabelas anymarket atualizadas com sucesso!',
      results,
      tables: {
        anymarket: {
          structure: anymarketStructure,
          columns: anymarketStructure.length,
          totalRecords: anymarketCount[0]?.total || 0
        },
        anymarket_sync_logs: {
          structure: anymarketSyncLogsStructure,
          columns: anymarketSyncLogsStructure.length,
          totalRecords: anymarketSyncLogsCount[0]?.total || 0
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar tabelas anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar tabelas anymarket',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Verificar estrutura atual das tabelas
    const anymarketStructure = await executeQuery(`DESCRIBE anymarket`);
    const anymarketSyncLogsStructure = await executeQuery(`DESCRIBE anymarket_sync_logs`);

    // Contar registros
    const anymarketCount = await executeQuery(`SELECT COUNT(*) as total FROM anymarket`);
    const anymarketSyncLogsCount = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    return NextResponse.json({
      success: true,
      message: 'Estrutura atual das tabelas anymarket',
      tables: {
        anymarket: {
          structure: anymarketStructure,
          columns: anymarketStructure.length,
          totalRecords: anymarketCount[0]?.total || 0
        },
        anymarket_sync_logs: {
          structure: anymarketSyncLogsStructure,
          columns: anymarketSyncLogsStructure.length,
          totalRecords: anymarketSyncLogsCount[0]?.total || 0
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabelas anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar tabelas anymarket',
      error: error.message
    }, { status: 500 });
  }
}

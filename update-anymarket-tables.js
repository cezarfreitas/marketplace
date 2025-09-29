// Script para atualizar tabelas anymarket
const mysql = require('mysql2/promise');

async function updateAnymarketTables() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    
    // Configuração da conexão (ajuste conforme necessário)
    connection = await mysql.createConnection({
      host: 'b2b_seo_banco',
      port: 3306,
      user: 'root',
      password: process.env.DB_PASSWORD || 'your_password_here',
      database: 'seo_db'
    });

    console.log('✅ Conectado ao banco de dados');

    const results = [];

    // 1. Remover coluna data_sincronizacao da tabela anymarket
    console.log('📝 Removendo coluna data_sincronizacao da tabela anymarket...');
    try {
      await connection.execute(`ALTER TABLE \`anymarket\` DROP COLUMN IF EXISTS \`data_sincronizacao\``);
      results.push('✅ Coluna data_sincronizacao removida da tabela anymarket');
      console.log('✅ Coluna data_sincronizacao removida da tabela anymarket');
    } catch (error) {
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
        await connection.execute(`ALTER TABLE \`anymarket_sync_logs\` ADD COLUMN IF NOT EXISTS \`${column.name}\` ${column.definition}`);
        results.push(`✅ Coluna ${column.name} adicionada à tabela anymarket_sync_logs`);
        console.log(`✅ Coluna ${column.name} adicionada à tabela anymarket_sync_logs`);
      } catch (error) {
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
        await connection.execute(`ALTER TABLE \`anymarket_sync_logs\` ADD INDEX IF NOT EXISTS \`${index}\` (\`${columnName}\`)`);
        results.push(`✅ Índice ${index} adicionado à tabela anymarket_sync_logs`);
        console.log(`✅ Índice ${index} adicionado à tabela anymarket_sync_logs`);
      } catch (error) {
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
    
    const [anymarketStructure] = await connection.execute(`DESCRIBE anymarket`);
    const [anymarketSyncLogsStructure] = await connection.execute(`DESCRIBE anymarket_sync_logs`);

    // 5. Contar registros
    const [anymarketCount] = await connection.execute(`SELECT COUNT(*) as total FROM anymarket`);
    const [anymarketSyncLogsCount] = await connection.execute(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    console.log('✅ Script executado com sucesso!');
    console.log('📊 Resultados:', results);
    console.log('📋 Estrutura da tabela anymarket:', anymarketStructure.length, 'colunas');
    console.log('📋 Estrutura da tabela anymarket_sync_logs:', anymarketSyncLogsStructure.length, 'colunas');
    console.log('📊 Registros na tabela anymarket:', anymarketCount[0].total);
    console.log('📊 Registros na tabela anymarket_sync_logs:', anymarketSyncLogsCount[0].total);

  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
updateAnymarketTables();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSettingsTable() {
  let connection;
  
  try {
    console.log('🔗 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      timezone: '-03:00',
      charset: 'utf8mb4'
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a tabela system_config existe
    console.log('\n🔍 Verificando tabela system_config...');
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'system_config'
    `);

    if (tables.length === 0) {
      console.log('❌ Tabela system_config não existe!');
      console.log('\n🔧 Criando tabela system_config...');
      
      await connection.execute(`
        CREATE TABLE system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(255) NOT NULL UNIQUE,
          config_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela system_config criada com sucesso!');
    } else {
      console.log('✅ Tabela system_config existe');
    }

    // Verificar estrutura da tabela
    console.log('\n📋 Estrutura da tabela system_config:');
    const [columns] = await connection.execute(`
      DESCRIBE system_config
    `);
    
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Verificar configurações existentes
    console.log('\n📝 Configurações existentes:');
    const [configs] = await connection.execute(`
      SELECT config_key, config_value, updated_at
      FROM system_config 
      ORDER BY config_key
    `);

    if (configs.length === 0) {
      console.log('Nenhuma configuração encontrada');
    } else {
      configs.forEach(config => {
        console.log(`- ${config.config_key}: ${config.config_value ? '***' : 'vazio'} (${config.updated_at})`);
      });
    }

    // Testar inserção de configuração
    console.log('\n🧪 Testando inserção de configuração...');
    await connection.execute(`
      INSERT INTO system_config (config_key, config_value) 
      VALUES ('test_config', 'test_value') 
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = CURRENT_TIMESTAMP
    `);
    
    console.log('✅ Teste de inserção bem-sucedido!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

checkSettingsTable();

// Verificar configurações do sistema
const mysql = require('mysql2/promise');

async function checkSystemConfig() {
  console.log('🔍 Verificando configurações do sistema...');
  
  const dbConfig = {
    host: 'server.idenegociosdigitais.com.br',
    port: 3349,
    user: 'meli',
    password: '7dd3e59ddb3c3a5da0e3',
    database: 'meli',
    charset: 'utf8mb4'
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se a tabela system_config existe
    console.log('\n📋 Verificando tabela system_config...');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'system_config'");
    
    if (tables.length > 0) {
      console.log('✅ Tabela system_config existe');
      
      // Verificar estrutura da tabela
      const [structure] = await connection.execute('DESCRIBE system_config');
      console.log('\n📋 Estrutura da tabela system_config:');
      console.table(structure);
      
      // Buscar todas as configurações
      const [configs] = await connection.execute('SELECT * FROM system_config');
      console.log('\n📊 Configurações encontradas:');
      console.table(configs);
      
      // Buscar especificamente as credenciais VTEX
      const [vtexConfigs] = await connection.execute(`
        SELECT * FROM system_config 
        WHERE config_key LIKE '%vtex%' 
        ORDER BY config_key
      `);
      
      if (vtexConfigs.length > 0) {
        console.log('\n🔐 Configurações VTEX:');
        console.table(vtexConfigs);
      } else {
        console.log('\n❌ Nenhuma configuração VTEX encontrada');
      }
      
    } else {
      console.log('❌ Tabela system_config não existe');
      
      // Verificar se há outras tabelas de configuração
      const [allTables] = await connection.execute('SHOW TABLES');
      const configTables = allTables.filter(table => 
        Object.values(table)[0].toLowerCase().includes('config') ||
        Object.values(table)[0].toLowerCase().includes('setting')
      );
      
      if (configTables.length > 0) {
        console.log('\n📋 Tabelas relacionadas a configuração encontradas:');
        console.table(configTables);
      }
    }
    
    await connection.end();
    console.log('\n✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkSystemConfig();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados externo
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  timezone: '-03:00',
  charset: 'utf8mb4'
};

async function setupConfigTable() {
  let connection;
  
  try {
    console.log('🔄 Criando tabela de configurações VTEX...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'create-config-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir o conteúdo em statements individuais
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        const cleanStmt = stmt.replace(/--.*$/gm, '').trim();
        return cleanStmt.length > 0 && 
               !cleanStmt.startsWith('--') && 
               !cleanStmt.match(/^\s*$/);
      });
    
    console.log(`📝 Executando ${statements.length} statements SQL...`);
    
    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executado com sucesso`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} - ${error.message} (ignorando)`);
          } else {
            console.error(`❌ Erro no statement ${i + 1}/${statements.length}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('🎉 Tabela de configurações criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND TABLE_NAME = 'system_config'
    `, [dbConfig.database]);
    
    if (tables.length > 0) {
      console.log('✅ Tabela system_config encontrada');
      
      // Verificar configurações inseridas
      const [configs] = await connection.execute(`
        SELECT config_key, config_value, description 
        FROM system_config 
        ORDER BY config_key
      `);
      
      console.log('\n📋 Configurações disponíveis:');
      configs.forEach(config => {
        console.log(`  - ${config.config_key}: ${config.config_value || '(vazio)'} - ${config.description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro durante a criação da tabela:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

// Executar configuração se o script for chamado diretamente
if (require.main === module) {
  setupConfigTable();
}

module.exports = { setupConfigTable };

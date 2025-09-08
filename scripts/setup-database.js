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

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Configurando banco de dados...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'create-tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir o conteúdo em statements individuais
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Filtrar comentários e linhas vazias
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
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY' || error.code === 'ER_NO_SUCH_TABLE') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} - ${error.message} (ignorando)`);
          } else {
            console.error(`❌ Erro no statement ${i + 1}/${statements.length}:`, error.message);
            // Não parar a execução por erros de views
            if (!statement.includes('CREATE OR REPLACE VIEW')) {
              throw error;
            }
          }
        }
      }
    }
    
    console.log('🎉 Configuração do banco de dados concluída com sucesso!');
    
    // Verificar tabelas criadas
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    console.log('\n📊 Tabelas configuradas:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // Verificar usuário padrão
    try {
      const [users] = await connection.execute(`
        SELECT username, email, is_active 
        FROM users 
        WHERE username = 'admin'
      `);
      
      if (users.length > 0) {
        console.log('\n👤 Usuário padrão configurado:');
        console.log(`  - Username: ${users[0].username}`);
        console.log(`  - Email: ${users[0].email}`);
        console.log(`  - Senha: admin123`);
      }
    } catch (error) {
      console.log('\n⚠️  Tabela users não encontrada - será criada na próxima execução');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
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
  setupDatabase();
}

module.exports = { setupDatabase };

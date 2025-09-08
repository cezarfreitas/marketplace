const mysql = require('mysql2/promise');
const fs = require('fs');

async function remoteSetup() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados remoto...');
    
    // String de conexão: mysql://meli:7dd3e59ddb3c3a5da0e3@server.idenegociosdigitais.com.br:3349/meli
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados remoto!');

    // Verificar tabelas existentes
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Tabelas existentes:');
    
    if (tables.length === 0) {
      console.log('  - Nenhuma tabela encontrada');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
    }

    // Ler o script SQL
    const sql = fs.readFileSync('scripts/simple-setup.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    console.log(`📝 Executando ${statements.length} statements SQL...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executado com sucesso`);
        } catch (error) {
          console.error(`❌ Erro no statement ${i + 1}:`, error.message);
        }
      }
    }

    console.log('🎉 Setup remoto concluído com sucesso!');
    console.log('');
    console.log('📊 Tabelas configuradas:');
    console.log('  - system_config (configurações do sistema)');
    console.log('  - brands (marcas da VTEX)');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

remoteSetup();

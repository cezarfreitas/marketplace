const mysql = require('mysql2/promise');
const fs = require('fs');

async function simpleSetup() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados');

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

    console.log('🎉 Setup simples concluído com sucesso!');
    console.log('');
    console.log('📊 Tabelas criadas:');
    console.log('  - system_config (configurações do sistema)');
    console.log('  - brands (marcas da VTEX)');
    console.log('');
    console.log('⚙️ Configurações padrão inseridas:');
    console.log('  - vtex_account_name');
    console.log('  - vtex_environment');
    console.log('  - vtex_app_key');
    console.log('  - vtex_app_token');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

simpleSetup();

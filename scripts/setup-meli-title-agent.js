const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupMeliTitleAgent() {
  let connection;
  
  try {
    // Configurar conexão com o banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados MySQL');

    // Ler o script SQL
    const sqlScript = fs.readFileSync('scripts/create-meli-title-agent.sql', 'utf8');
    
    // Dividir o script em comandos individuais
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Executando ${commands.length} comandos SQL...`);

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
          await connection.execute(command);
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️ Comando ${i + 1}: Agente já existe (ignorando erro de duplicata)`);
          } else {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
          }
        }
      }
    }

    // Verificar se o agente foi criado
    console.log('\n🔍 Verificando se o agente foi criado...');
    const [agents] = await connection.execute(`
      SELECT id, name, function_type, model, temperature, max_tokens, is_active, created_at
      FROM agents 
      WHERE function_type = 'title_generation' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (agents.length > 0) {
      const agent = agents[0];
      console.log('✅ Agente especializado em títulos criado com sucesso!');
      console.log(`📋 Detalhes do agente:`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Nome: ${agent.name}`);
      console.log(`   Função: ${agent.function_type}`);
      console.log(`   Modelo: ${agent.model}`);
      console.log(`   Temperatura: ${agent.temperature}`);
      console.log(`   Max Tokens: ${agent.max_tokens}`);
      console.log(`   Ativo: ${agent.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${agent.created_at}`);
    } else {
      console.log('❌ Agente não foi encontrado. Verifique se houve erros na execução.');
    }

  } catch (error) {
    console.error('❌ Erro ao configurar agente:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupMeliTitleAgent()
    .then(() => {
      console.log('\n🎉 Configuração do agente concluída!');
      console.log('💡 Agora você pode usar o sistema de geração de títulos otimizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na configuração:', error.message);
      process.exit(1);
    });
}

module.exports = { setupMeliTitleAgent };

const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  charset: 'utf8mb4',
};

async function addContextoColumn() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado com sucesso!');
    
    console.log('🔄 Adicionando coluna "contexto" na tabela brands...');
    
    // Adicionar a coluna contexto
    const alterTableSQL = `
      ALTER TABLE brands 
      ADD COLUMN contexto TEXT AFTER meta_tag_description
    `;
    
    await connection.execute(alterTableSQL);
    console.log('✅ Coluna "contexto" adicionada com sucesso!');
    
    // Verificar a nova estrutura da tabela
    console.log('\n📋 Nova estrutura da tabela brands:');
    const [columns] = await connection.execute("DESCRIBE brands");
    console.table(columns);
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ A coluna "contexto" já existe na tabela');
    } else {
      console.error('❌ Erro ao adicionar coluna:', error);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

// Executar
addContextoColumn();

const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3342'),
  user: process.env.DB_USER || 'seo_data',
  password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
  database: process.env.DB_NAME || 'seo_data',
  charset: 'utf8mb4'
};

async function removeIdColumnFromProducts() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');

    // Verificar estrutura atual da tabela
    console.log('🔍 Verificando estrutura atual da tabela products_vtex...');
    const [structure] = await connection.execute('DESCRIBE products_vtex');
    console.log('\n📋 Estrutura atual:');
    console.table(structure);

    // Verificar se a coluna id existe
    const idColumn = structure.find(col => col.Field === 'id');
    if (!idColumn) {
      console.log('⚠️ Coluna "id" não encontrada na tabela products_vtex');
      return;
    }

    console.log('\n🗑️ Removendo coluna "id" da tabela products_vtex...');
    
    // Remover a coluna id
    await connection.execute('ALTER TABLE products_vtex DROP COLUMN id');
    console.log('✅ Coluna "id" removida com sucesso!');

    // Verificar estrutura após a remoção
    console.log('\n🔍 Verificando estrutura após a remoção...');
    const [newStructure] = await connection.execute('DESCRIBE products_vtex');
    console.log('\n📋 Nova estrutura:');
    console.table(newStructure);

    // Verificar se vtex_id é a chave primária agora
    const primaryKey = newStructure.find(col => col.Key === 'PRI');
    if (primaryKey) {
      console.log(`\n🔑 Chave primária atual: ${primaryKey.Field}`);
    } else {
      console.log('\n⚠️ Nenhuma chave primária encontrada');
    }

    console.log('\n✅ Operação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
}

// Executar o script
removeIdColumnFromProducts();

const mysql = require('mysql2/promise');

async function checkMarketplaceStructure() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar estrutura da tabela marketplace
    console.log('🔍 Verificando estrutura da tabela marketplace...');
    
    const [columns] = await connection.execute('DESCRIBE marketplace');
    
    console.log('\n📊 Estrutura atual da tabela marketplace:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Identificar colunas que devem ser removidas
    const columnsToRemove = [
      'SELLER_SKU',
      'WEDGE_SHAPE', 
      'IS_SPORTIVE',
      'MAIN_COLOR',
      'ITEM_CONDITION',
      'BRAND'
    ];

    console.log('\n🗑️ Colunas que devem ser removidas:');
    const existingColumnsToRemove = columns.filter(col => 
      columnsToRemove.includes(col.Field)
    );

    if (existingColumnsToRemove.length > 0) {
      existingColumnsToRemove.forEach(col => {
        console.log(`- ${col.Field} (${col.Type})`);
      });
    } else {
      console.log('⚠️ Nenhuma das colunas especificadas foi encontrada');
    }

    // Verificar dados existentes
    console.log('\n📈 Dados existentes:');
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM marketplace');
    console.log(`Total de registros: ${count[0].total}`);

    // Mostrar alguns registros de exemplo
    const [samples] = await connection.execute(`
      SELECT id, product_id, title, description, created_at
      FROM marketplace 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (samples && samples.length > 0) {
      console.log('\n📝 Registros de exemplo:');
      samples.forEach((record, index) => {
        console.log(`${index + 1}. ID: ${record.id} - Produto: ${record.product_id}`);
        console.log(`   Título: ${record.title?.substring(0, 50)}...`);
        console.log(`   Criado em: ${record.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkMarketplaceStructure();

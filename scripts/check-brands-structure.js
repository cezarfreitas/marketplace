const mysql = require('mysql2/promise');

async function checkBrandsStructure() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados remoto...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados remoto!');

    // Verificar estrutura atual da tabela
    console.log('📊 Verificando estrutura atual da tabela brands...');
    const [columns] = await connection.execute('DESCRIBE brands');
    console.log('Colunas existentes:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    // Testar consulta simples
    console.log('🔍 Testando consulta simples...');
    const [simpleResult] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    console.log(`Total de marcas: ${simpleResult[0].total}`);

    // Testar consulta com alguns campos básicos
    console.log('🔍 Testando consulta com campos básicos...');
    const [basicResult] = await connection.execute('SELECT id, vtex_id, name, is_active, created_at FROM brands LIMIT 3');
    console.log('Primeiras 3 marcas:');
    basicResult.forEach(brand => {
      console.log(`  - ${brand.name} (ID: ${brand.id})`);
    });

    // Testar busca
    console.log('🔍 Testando busca...');
    const [searchResult] = await connection.execute('SELECT id, name FROM brands WHERE name LIKE ? LIMIT 3', ['%+55%']);
    console.log('Resultado da busca por "+55":');
    searchResult.forEach(brand => {
      console.log(`  - ${brand.name} (ID: ${brand.id})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkBrandsStructure();

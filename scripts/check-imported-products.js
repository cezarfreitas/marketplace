const mysql = require('mysql2/promise');
const { config } = require('dotenv');

config();

const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3349'),
  user: process.env.DB_USER || 'meli',
  password: process.env.DB_PASSWORD || '7dd3e59ddb3c3a5da0e3',
  database: process.env.DB_NAME || 'meli',
};

async function checkImportedProducts() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar produtos importados
    console.log('\n📦 Verificando produtos importados...');
    const [products] = await connection.execute(`
      SELECT id, vtex_id, name, ref_id, is_active, created_at
      FROM products 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Total de produtos encontrados: ${products.length}`);
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ID: ${product.id}`);
      console.log(`   VTEX ID: ${product.vtex_id}`);
      console.log(`   Nome: ${product.name}`);
      console.log(`   RefId: ${product.ref_id}`);
      console.log(`   Ativo: ${product.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${product.created_at}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar produtos:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkImportedProducts();

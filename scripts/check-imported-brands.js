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

async function checkImportedBrands() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar marcas importadas
    console.log('\n🏷️ Verificando marcas importadas...');
    const [brands] = await connection.execute(`
      SELECT id, vtex_id, name, is_active, title, created_at
      FROM brands 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Total de marcas encontradas: ${brands.length}`);
    brands.forEach((brand, index) => {
      console.log(`\n${index + 1}. ID: ${brand.id}`);
      console.log(`   VTEX ID: ${brand.vtex_id}`);
      console.log(`   Nome: ${brand.name}`);
      console.log(`   Ativo: ${brand.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Título: ${brand.title || 'N/A'}`);
      console.log(`   Criado em: ${brand.created_at}`);
    });

    // Verificar produtos com marcas
    console.log('\n📦 Verificando produtos com marcas...');
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.ref_id, b.name as brand_name, b.vtex_id as brand_vtex_id
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.brand_id IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 Produtos com marcas: ${products.length}`);
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Produto: ${product.name}`);
      console.log(`   RefId: ${product.ref_id}`);
      console.log(`   Marca: ${product.brand_name} (VTEX ID: ${product.brand_vtex_id})`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar marcas:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkImportedBrands();

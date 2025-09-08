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

async function checkImportedSKUs() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar SKUs importados
    console.log('\n📋 Verificando SKUs importados...');
    const [skus] = await connection.execute(`
      SELECT s.id, s.vtex_id, s.sku_name, s.is_active, s.product_id, p.name as product_name, p.ref_id
      FROM skus s
      LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Total de SKUs encontrados: ${skus.length}`);
    skus.forEach((sku, index) => {
      console.log(`\n${index + 1}. ID: ${sku.id}`);
      console.log(`   VTEX ID: ${sku.vtex_id}`);
      console.log(`   Nome: ${sku.sku_name}`);
      console.log(`   Ativo: ${sku.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Produto: ${sku.product_name} (RefId: ${sku.ref_id})`);
    });

    // Verificar produtos com SKUs
    console.log('\n📦 Verificando produtos com SKUs...');
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.ref_id, COUNT(s.id) as sku_count
      FROM products p
      LEFT JOIN skus s ON p.id = s.product_id
      GROUP BY p.id, p.name, p.ref_id
      HAVING sku_count > 0
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 Produtos com SKUs: ${products.length}`);
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Produto: ${product.name}`);
      console.log(`   RefId: ${product.ref_id}`);
      console.log(`   SKUs: ${product.sku_count}`);
    });

    // Verificar relacionamentos completos
    console.log('\n🔗 Verificando relacionamentos completos...');
    const [complete] = await connection.execute(`
      SELECT p.name as product_name, p.ref_id,
             b.name as brand_name,
             c.name as category_name,
             COUNT(s.id) as sku_count
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN skus s ON p.id = s.product_id
      WHERE p.brand_id IS NOT NULL AND p.category_id IS NOT NULL
      GROUP BY p.id, p.name, p.ref_id, b.name, c.name
      ORDER BY p.created_at DESC
      LIMIT 3
    `);

    console.log(`\n📊 Produtos com relacionamentos completos: ${complete.length}`);
    complete.forEach((item, index) => {
      console.log(`\n${index + 1}. Produto: ${item.product_name}`);
      console.log(`   RefId: ${item.ref_id}`);
      console.log(`   Marca: ${item.brand_name}`);
      console.log(`   Categoria: ${item.category_name}`);
      console.log(`   SKUs: ${item.sku_count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar SKUs:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkImportedSKUs();

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

async function checkImportedCategories() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar categorias importadas
    console.log('\n📂 Verificando categorias importadas...');
    const [categories] = await connection.execute(`
      SELECT id, vtex_id, name, father_category_id, title, is_active, created_at
      FROM categories 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Total de categorias encontradas: ${categories.length}`);
    categories.forEach((category, index) => {
      console.log(`\n${index + 1}. ID: ${category.id}`);
      console.log(`   VTEX ID: ${category.vtex_id}`);
      console.log(`   Nome: ${category.name}`);
      console.log(`   Categoria Pai: ${category.father_category_id || 'N/A'}`);
      console.log(`   Título: ${category.title || 'N/A'}`);
      console.log(`   Ativo: ${category.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${category.created_at}`);
    });

    // Verificar produtos com categorias e marcas
    console.log('\n📦 Verificando produtos com categorias e marcas...');
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.ref_id, 
             b.name as brand_name, b.vtex_id as brand_vtex_id,
             c.name as category_name, c.vtex_id as category_vtex_id
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.brand_id IS NOT NULL AND p.category_id IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 Produtos com categorias e marcas: ${products.length}`);
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Produto: ${product.name}`);
      console.log(`   RefId: ${product.ref_id}`);
      console.log(`   Marca: ${product.brand_name} (VTEX ID: ${product.brand_vtex_id})`);
      console.log(`   Categoria: ${product.category_name} (VTEX ID: ${product.category_vtex_id})`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar categorias:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkImportedCategories();

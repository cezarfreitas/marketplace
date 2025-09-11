const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkExistingCategories() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'seo_data',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Verificar se existem categorias na tabela
    const [categories] = await connection.execute(`
      SELECT vtex_id, name, title, is_active, father_category_id
      FROM categories_vtex 
      LIMIT 5
    `);

    console.log('📂 Categorias existentes na tabela categories_vtex:');
    if (categories.length > 0) {
      categories.forEach(category => {
        console.log(`  - ${category.name} (vtex_id: ${category.vtex_id}, ativa: ${category.is_active})`);
      });
    } else {
      console.log('  Nenhuma categoria encontrada na tabela');
    }

    // Verificar produtos com category_id
    const [products] = await connection.execute(`
      SELECT DISTINCT category_id, name 
      FROM products_vtex 
      WHERE category_id IS NOT NULL 
      LIMIT 3
    `);

    console.log('\n📦 Produtos com category_id:');
    products.forEach(product => {
      console.log(`  - ${product.name} (category_id: ${product.category_id})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
checkExistingCategories();

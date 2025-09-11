const mysql = require('mysql2/promise');
require('dotenv').config();

async function findExistingCategory() {
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

    // Buscar produtos que têm category_id
    const [products] = await connection.execute(`
      SELECT DISTINCT category_id, name 
      FROM products_vtex 
      WHERE category_id IS NOT NULL 
      LIMIT 5
    `);

    console.log('📦 Produtos com category_id encontrados:');
    products.forEach(product => {
      console.log(`  - ${product.name} (category_id: ${product.category_id})`);
    });

    if (products.length > 0) {
      const testCategoryId = products[0].category_id;
      console.log(`\n🎯 Testando com category_id: ${testCategoryId}`);
      
      // Testar busca na VTEX
      const config = {
        vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
        vtex_environment: process.env.VTEX_ENVIRONMENT,
        vtex_app_key: process.env.VTEX_APP_KEY,
        vtex_app_token: process.env.VTEX_APP_TOKEN,
      };

      const baseUrl = `https://${config.vtex_account_name}.${config.vtex_environment}.com.br`;
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VTEX-API-AppKey': config.vtex_app_key,
        'X-VTEX-API-AppToken': config.vtex_app_token,
      };

      console.log(`🔍 Buscando categoria na VTEX: ${baseUrl}/api/catalog_system/pvt/category/${testCategoryId}`);
      
      const response = await fetch(`${baseUrl}/api/catalog_system/pvt/category/${testCategoryId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const category = await response.json();
        console.log(`✅ Categoria encontrada: ${category.name}`);
        console.log(`📝 Dados da categoria:`, JSON.stringify(category, null, 2));
      } else {
        console.log(`❌ Erro ao buscar categoria: ${response.status} ${response.statusText}`);
      }
    }

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
findExistingCategory();

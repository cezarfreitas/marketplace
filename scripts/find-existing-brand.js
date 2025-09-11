const mysql = require('mysql2/promise');
require('dotenv').config();

async function findExistingBrand() {
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

    // Buscar produtos que têm brand_id
    const [products] = await connection.execute(`
      SELECT DISTINCT brand_id, name 
      FROM products_vtex 
      WHERE brand_id IS NOT NULL 
      LIMIT 5
    `);

    console.log('📦 Produtos com brand_id encontrados:');
    products.forEach(product => {
      console.log(`  - ${product.name} (brand_id: ${product.brand_id})`);
    });

    if (products.length > 0) {
      const testBrandId = products[0].brand_id;
      console.log(`\n🎯 Testando com brand_id: ${testBrandId}`);
      
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

      console.log(`🔍 Buscando marca na VTEX: ${baseUrl}/api/catalog_system/pvt/brand/${testBrandId}`);
      
      const response = await fetch(`${baseUrl}/api/catalog_system/pvt/brand/${testBrandId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const brand = await response.json();
        console.log(`✅ Marca encontrada: ${brand.name}`);
        console.log(`📝 Dados da marca:`, JSON.stringify(brand, null, 2));
      } else {
        console.log(`❌ Erro ao buscar marca: ${response.status} ${response.statusText}`);
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
findExistingBrand();

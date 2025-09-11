const mysql = require('mysql2/promise');
require('dotenv').config();

async function findExistingProductForSku() {
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

    // Buscar produtos que existem na tabela products_vtex
    const [products] = await connection.execute(`
      SELECT vtex_id, name 
      FROM products_vtex 
      LIMIT 5
    `);

    console.log('📦 Produtos existentes na tabela products_vtex:');
    products.forEach(product => {
      console.log(`  - ${product.name} (vtex_id: ${product.vtex_id})`);
    });

    if (products.length > 0) {
      const testProductVtexId = products[0].vtex_id;
      console.log(`\n🎯 Testando busca de SKUs para produto: ${testProductVtexId}`);
      
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

      console.log(`🔍 Buscando SKUs na VTEX: ${baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${testProductVtexId}`);
      
      const response = await fetch(`${baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${testProductVtexId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const skus = await response.json();
        console.log(`✅ ${skus.length} SKUs encontrados para o produto ${testProductVtexId}`);
        
        if (skus.length > 0) {
          console.log('📋 SKUs encontrados:');
          skus.forEach((sku, index) => {
            console.log(`  ${index + 1}. ${sku.Name} (ID: ${sku.Id}, Ativo: ${sku.IsActive})`);
          });
        }
      } else {
        console.log(`❌ Erro ao buscar SKUs: ${response.status} ${response.statusText}`);
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
findExistingProductForSku();

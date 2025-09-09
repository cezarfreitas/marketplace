const mysql = require('mysql2/promise');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function importStockData() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Buscar configurações VTEX
    console.log('\n⚙️ 1. Buscando configurações VTEX...');
    const [config] = await connection.execute(`
      SELECT * FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
      ORDER BY config_key
    `);
    
    if (config.length === 0) {
      console.log('❌ Configurações VTEX não encontradas');
      return;
    }
    
    const vtexConfig = {};
    config.forEach(cfg => {
      vtexConfig[cfg.config_key] = cfg.config_value;
    });
    
    const accountName = vtexConfig['vtex_account_name'];
    const environment = vtexConfig['vtex_environment'];
    const appKey = vtexConfig['vtex_app_key'];
    const appToken = vtexConfig['vtex_app_token'];
    
    if (!accountName || !appKey || !appToken) {
      console.log('❌ Configurações VTEX incompletas');
      return;
    }
    
    console.log('✅ Configurações VTEX encontradas');
    
    // 2. Buscar SKUs do banco
    console.log('\n📋 2. Buscando SKUs do banco...');
    const [skus] = await connection.execute(`
      SELECT s.id, s.vtex_id, s.name_complete, p.name as product_name, p.ref_id
      FROM skus s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.id
      LIMIT 10
    `);
    
    if (skus.length === 0) {
      console.log('❌ Nenhum SKU encontrado no banco');
      console.log('💡 Importe produtos primeiro antes de importar estoque');
      return;
    }
    
    console.log(`📊 Encontrados ${skus.length} SKUs para processar`);
    
    // 3. Processar cada SKU
    console.log('\n🔄 3. Processando SKUs...');
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      console.log(`\n🔍 Processando SKU ${i + 1}/${skus.length}: ${sku.vtex_id} (${sku.name_complete})`);
      
      try {
        // 3.1. Buscar dados de estoque da API VTEX
        const vtexApiUrl = `https://${accountName}.${environment || 'vtexcommercestable'}.com.br/api/logistics/pvt/inventory/skus/${sku.vtex_id}`;
        
        console.log(`📤 Fazendo requisição para: ${vtexApiUrl}`);
        
        const response = await fetch(vtexApiUrl, {
          method: 'GET',
          headers: {
            'X-VTEX-API-AppKey': appKey,
            'X-VTEX-API-AppToken': appToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const stockData = await response.json();
          console.log(`📥 Dados de estoque recebidos para SKU ${sku.vtex_id}`);
          
          // 3.2. Processar dados de estoque
          if (stockData.balance && Array.isArray(stockData.balance)) {
            console.log(`📊 Processando ${stockData.balance.length} warehouses para SKU ${sku.vtex_id}`);
            
            for (const balance of stockData.balance) {
              try {
                // 3.3. Inserir dados de estoque no banco
                await connection.execute(`
                  INSERT INTO stock (
                    sku_id, vtex_sku_id, warehouse_id, warehouse_name,
                    total_quantity, reserved_quantity, has_unlimited_quantity,
                    time_to_refill, date_of_supply_utc, lead_time
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                    total_quantity = VALUES(total_quantity),
                    reserved_quantity = VALUES(reserved_quantity),
                    has_unlimited_quantity = VALUES(has_unlimited_quantity),
                    time_to_refill = VALUES(time_to_refill),
                    date_of_supply_utc = VALUES(date_of_supply_utc),
                    lead_time = VALUES(lead_time),
                    updated_at = CURRENT_TIMESTAMP
                `, [
                  sku.id,
                  sku.vtex_id,
                  balance.warehouseId,
                  balance.warehouseName,
                  balance.totalQuantity || 0,
                  balance.reservedQuantity || 0,
                  balance.hasUnlimitedQuantity || false,
                  balance.timeToRefill,
                  balance.dateOfSupplyUtc ? new Date(balance.dateOfSupplyUtc) : null,
                  balance.leadTime
                ]);
                
                console.log(`✅ Estoque inserido: ${balance.warehouseName} - Qtd: ${balance.totalQuantity}, Reservado: ${balance.reservedQuantity}`);
                
              } catch (insertError) {
                console.error(`❌ Erro ao inserir estoque para warehouse ${balance.warehouseId}:`, insertError.message);
                errorCount++;
              }
            }
            
            successCount++;
          } else {
            console.log(`⚠️ SKU ${sku.vtex_id} não possui dados de estoque`);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ Erro na API VTEX para SKU ${sku.vtex_id}: ${response.status} ${response.statusText}`);
          console.log(`   Erro: ${errorText}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar SKU ${sku.vtex_id}:`, error.message);
        errorCount++;
      }
      
      processedCount++;
      
      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 4. Resumo final
    console.log('\n📊 4. Resumo da importação:');
    console.log(`   - SKUs processados: ${processedCount}`);
    console.log(`   - Sucessos: ${successCount}`);
    console.log(`   - Erros: ${errorCount}`);
    
    // 5. Verificar dados inseridos
    console.log('\n🔍 5. Verificando dados de estoque inseridos...');
    const [stockCount] = await connection.execute('SELECT COUNT(*) as total FROM stock');
    const [stockSummary] = await connection.execute(`
      SELECT 
        warehouse_name,
        COUNT(*) as sku_count,
        SUM(total_quantity) as total_stock,
        SUM(reserved_quantity) as total_reserved
      FROM stock 
      GROUP BY warehouse_name
      ORDER BY total_stock DESC
    `);
    
    console.log(`📊 Total de registros de estoque: ${stockCount[0].total}`);
    console.log('📋 Resumo por warehouse:');
    console.table(stockSummary);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o script
importStockData();

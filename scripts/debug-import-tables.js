const mysql = require('mysql2/promise');

async function debugImportTables() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar estrutura das tabelas principais
    const tables = [
      'products_vtex',
      'skus_vtex', 
      'images_vtex',
      'brands',
      'categories',
      'analise_imagens',
      'anymarket'
    ];

    console.log('🔍 Verificando estrutura das tabelas...');
    
    for (const table of tables) {
      try {
        console.log(`\n📊 Tabela: ${table}`);
        const [structure] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`   Colunas: ${structure.length}`);
        
        // Verificar se a tabela tem dados
        const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`   Registros: ${count[0].total}`);
        
        // Se tem dados, mostrar alguns exemplos
        if (count[0].total > 0) {
          const [sample] = await connection.execute(`SELECT * FROM ${table} LIMIT 2`);
          console.log(`   Exemplo:`, sample[0]);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }

    // Verificar configurações da VTEX
    console.log('\n🔍 Verificando configurações da VTEX...');
    try {
      const [vtexConfig] = await connection.execute(`
        SELECT * FROM system_config 
        WHERE config_key LIKE 'VTEX_%' 
        ORDER BY config_key
      `);
      
      if (vtexConfig.length > 0) {
        console.log('📋 Configurações VTEX encontradas:');
        vtexConfig.forEach(config => {
          console.log(`   ${config.config_key}: ${config.config_value ? 'SET' : 'NOT SET'}`);
        });
      } else {
        console.log('⚠️ Nenhuma configuração VTEX encontrada na tabela system_config');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar configurações VTEX: ${error.message}`);
    }

    // Verificar produtos com problemas
    console.log('\n🔍 Verificando produtos com problemas...');
    try {
      const [productsWithoutImages] = await connection.execute(`
        SELECT p.id, p.name, p.ref_id, 
               (SELECT COUNT(*) FROM images_vtex i WHERE i.product_id = p.id) as image_count
        FROM products_vtex p 
        WHERE (SELECT COUNT(*) FROM images_vtex i WHERE i.product_id = p.id) = 0
        LIMIT 5
      `);
      
      if (productsWithoutImages.length > 0) {
        console.log('⚠️ Produtos sem imagens:');
        productsWithoutImages.forEach(p => {
          console.log(`   ID: ${p.id}, Nome: ${p.name}, RefId: ${p.ref_id}`);
        });
      } else {
        console.log('✅ Todos os produtos têm imagens');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar produtos sem imagens: ${error.message}`);
    }

    // Verificar SKUs órfãos
    console.log('\n🔍 Verificando SKUs órfãos...');
    try {
      const [orphanSkus] = await connection.execute(`
        SELECT s.id, s.sku_id, s.product_id
        FROM skus_vtex s 
        LEFT JOIN products_vtex p ON s.product_id = p.id
        WHERE p.id IS NULL
        LIMIT 5
      `);
      
      if (orphanSkus.length > 0) {
        console.log('⚠️ SKUs órfãos encontrados:');
        orphanSkus.forEach(s => {
          console.log(`   SKU ID: ${s.sku_id}, Product ID: ${s.product_id}`);
        });
      } else {
        console.log('✅ Nenhum SKU órfão encontrado');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar SKUs órfãos: ${error.message}`);
    }

    // Verificar imagens órfãs
    console.log('\n🔍 Verificando imagens órfãs...');
    try {
      const [orphanImages] = await connection.execute(`
        SELECT i.id, i.image_url, i.product_id
        FROM images_vtex i 
        LEFT JOIN products_vtex p ON i.product_id = p.id
        WHERE p.id IS NULL
        LIMIT 5
      `);
      
      if (orphanImages.length > 0) {
        console.log('⚠️ Imagens órfãs encontradas:');
        orphanImages.forEach(img => {
          console.log(`   Image ID: ${img.id}, Product ID: ${img.product_id}, URL: ${img.image_url}`);
        });
      } else {
        console.log('✅ Nenhuma imagem órfã encontrada');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar imagens órfãs: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

debugImportTables();

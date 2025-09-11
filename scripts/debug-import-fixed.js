const mysql = require('mysql2/promise');

async function debugImportFixed() {
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

    // Verificar produtos sem imagens (corrigido)
    console.log('\n🔍 Verificando produtos sem imagens...');
    try {
      const [productsWithoutImages] = await connection.execute(`
        SELECT p.id, p.name, p.ref_id, 
               (SELECT COUNT(*) FROM images_vtex i WHERE i.sku_id IN (
                 SELECT s.id FROM skus_vtex s WHERE s.product_id = p.id
               )) as image_count
        FROM products_vtex p 
        WHERE (SELECT COUNT(*) FROM images_vtex i WHERE i.sku_id IN (
          SELECT s.id FROM skus_vtex s WHERE s.product_id = p.id
        )) = 0
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

    // Verificar SKUs órfãos (corrigido)
    console.log('\n🔍 Verificando SKUs órfãos...');
    try {
      const [orphanSkus] = await connection.execute(`
        SELECT s.id, s.product_id, s.name
        FROM skus_vtex s 
        LEFT JOIN products_vtex p ON s.product_id = p.id
        WHERE p.id IS NULL
        LIMIT 5
      `);
      
      if (orphanSkus.length > 0) {
        console.log('⚠️ SKUs órfãos encontrados:');
        orphanSkus.forEach(s => {
          console.log(`   SKU ID: ${s.id}, Product ID: ${s.product_id}, Nome: ${s.name}`);
        });
      } else {
        console.log('✅ Nenhum SKU órfão encontrado');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar SKUs órfãos: ${error.message}`);
    }

    // Verificar imagens órfãs (corrigido)
    console.log('\n🔍 Verificando imagens órfãs...');
    try {
      const [orphanImages] = await connection.execute(`
        SELECT i.id, i.file_location, i.sku_id
        FROM images_vtex i 
        LEFT JOIN skus_vtex s ON i.sku_id = s.id
        WHERE s.id IS NULL
        LIMIT 5
      `);
      
      if (orphanImages.length > 0) {
        console.log('⚠️ Imagens órfãs encontradas:');
        orphanImages.forEach(img => {
          console.log(`   Image ID: ${img.id}, SKU ID: ${img.sku_id}, File: ${img.file_location}`);
        });
      } else {
        console.log('✅ Nenhuma imagem órfã encontrada');
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar imagens órfãs: ${error.message}`);
    }

    // Verificar relacionamentos entre tabelas
    console.log('\n🔍 Verificando relacionamentos...');
    try {
      const [relationships] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM products_vtex) as total_products,
          (SELECT COUNT(*) FROM skus_vtex) as total_skus,
          (SELECT COUNT(*) FROM images_vtex) as total_images,
          (SELECT COUNT(DISTINCT s.product_id) FROM skus_vtex s) as products_with_skus,
          (SELECT COUNT(DISTINCT i.sku_id) FROM images_vtex i) as skus_with_images
      `);
      
      const stats = relationships[0];
      console.log('📊 Estatísticas:');
      console.log(`   Total de produtos: ${stats.total_products}`);
      console.log(`   Total de SKUs: ${stats.total_skus}`);
      console.log(`   Total de imagens: ${stats.total_images}`);
      console.log(`   Produtos com SKUs: ${stats.products_with_skus}`);
      console.log(`   SKUs com imagens: ${stats.skus_with_images}`);
      
      // Verificar se há problemas
      if (stats.total_products > stats.products_with_skus) {
        console.log(`⚠️ ${stats.total_products - stats.products_with_skus} produtos sem SKUs`);
      }
      
      if (stats.total_skus > stats.skus_with_images) {
        console.log(`⚠️ ${stats.total_skus - stats.skus_with_images} SKUs sem imagens`);
      }
      
    } catch (error) {
      console.log(`❌ Erro ao verificar relacionamentos: ${error.message}`);
    }

    // Verificar se as tabelas brands e categories existem
    console.log('\n🔍 Verificando tabelas brands e categories...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'seo_data' 
        AND TABLE_NAME IN ('brands', 'categories')
      `);
      
      if (tables.length === 0) {
        console.log('⚠️ Tabelas brands e categories não existem');
        console.log('💡 Isso pode causar problemas na importação');
      } else {
        console.log('✅ Tabelas encontradas:');
        tables.forEach(table => {
          console.log(`   - ${table.TABLE_NAME}`);
        });
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar tabelas: ${error.message}`);
    }

    // Verificar configurações da VTEX no .env
    console.log('\n🔍 Verificando configurações da VTEX...');
    const vtexConfig = {
      VTEX_ACCOUNT_NAME: process.env.VTEX_ACCOUNT_NAME,
      VTEX_ENVIRONMENT: process.env.VTEX_ENVIRONMENT,
      VTEX_APP_KEY: process.env.VTEX_APP_KEY,
      VTEX_APP_TOKEN: process.env.VTEX_APP_TOKEN,
    };
    
    console.log('📋 Configurações VTEX:');
    Object.entries(vtexConfig).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? 'SET' : 'NOT SET'}`);
    });
    
    const missingConfigs = Object.entries(vtexConfig).filter(([key, value]) => !value);
    if (missingConfigs.length > 0) {
      console.log('⚠️ Configurações faltando:');
      missingConfigs.forEach(([key]) => {
        console.log(`   - ${key}`);
      });
    } else {
      console.log('✅ Todas as configurações VTEX estão definidas');
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

debugImportFixed();

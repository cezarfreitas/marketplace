const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkProductData() {
  let connection;
  
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST,
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('🔍 Verificando dados dos produtos...');
    
    // Verificar produtos que têm título mas não descrição
    const [productsWithTitleOnly] = await connection.execute(`
      SELECT p.id, p.ref_id, p.name, t.title
      FROM products_vtex p 
      INNER JOIN titles t ON p.id = t.product_id 
      LEFT JOIN descriptions d ON p.id = d.product_id 
      WHERE d.id IS NULL
      LIMIT 5
    `);
    
    console.log('📋 Produtos com título mas sem descrição:');
    productsWithTitleOnly.forEach((prod, index) => {
      console.log(`   ${index + 1}. ID ${prod.id} - ${prod.ref_id}: ${prod.name.substring(0, 50)}...`);
      console.log(`      Título: ${prod.title.substring(0, 80)}...`);
    });
    
    // Verificar produtos que têm descrição mas não título
    const [productsWithDescriptionOnly] = await connection.execute(`
      SELECT p.id, p.ref_id, p.name, d.description
      FROM products_vtex p 
      INNER JOIN descriptions d ON p.id = d.product_id 
      LEFT JOIN titles t ON p.id = t.product_id 
      WHERE t.id IS NULL
      LIMIT 5
    `);
    
    console.log('\n📋 Produtos com descrição mas sem título:');
    productsWithDescriptionOnly.forEach((prod, index) => {
      console.log(`   ${index + 1}. ID ${prod.id} - ${prod.ref_id}: ${prod.name.substring(0, 50)}...`);
      console.log(`      Descrição: ${prod.description.substring(0, 80)}...`);
    });
    
    // Verificar produtos que têm ambos
    const [productsWithBoth] = await connection.execute(`
      SELECT p.id, p.ref_id, p.name, t.title, d.description
      FROM products_vtex p 
      INNER JOIN titles t ON p.id = t.product_id 
      INNER JOIN descriptions d ON p.id = d.product_id 
      LIMIT 3
    `);
    
    console.log('\n📋 Produtos com título E descrição:');
    productsWithBoth.forEach((prod, index) => {
      console.log(`   ${index + 1}. ID ${prod.id} - ${prod.ref_id}: ${prod.name.substring(0, 50)}...`);
      console.log(`      Título: ${prod.title.substring(0, 80)}...`);
      console.log(`      Descrição: ${prod.description.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

checkProductData();

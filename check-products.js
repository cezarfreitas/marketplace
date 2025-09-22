// Script para verificar produtos no banco
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProducts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando produtos no banco...\n');

    // 1. Contar total de produtos
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM products_vtex');
    console.log(`📊 Total de produtos: ${totalResult[0].total}`);

    // 2. Buscar alguns produtos com anymarket_id
    const [productsWithAnymarket] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.name,
        p.ref_produto,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN anymarket a ON p.ref_produto = a.ref_produto_vtex
      WHERE a.id_produto_any IS NOT NULL
      LIMIT 5
    `);

    console.log(`\n✅ Produtos com anymarket_id (primeiros 5):`);
    productsWithAnymarket.forEach((product, index) => {
      console.log(`   ${index + 1}. ID: ${product.id_produto_vtex}, Nome: ${product.name}, Anymarket ID: ${product.anymarket_id}`);
    });

    // 3. Buscar alguns produtos sem anymarket_id
    const [productsWithoutAnymarket] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.name,
        p.ref_produto
      FROM products_vtex p
      LEFT JOIN anymarket a ON p.ref_produto = a.ref_produto_vtex
      WHERE a.id_produto_any IS NULL
      LIMIT 5
    `);

    console.log(`\n⚠️ Produtos sem anymarket_id (primeiros 5):`);
    productsWithoutAnymarket.forEach((product, index) => {
      console.log(`   ${index + 1}. ID: ${product.id_produto_vtex}, Nome: ${product.name}`);
    });

    // 4. Verificar se existe produto com ID 1
    const [product1] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.name,
        p.ref_produto,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN anymarket a ON p.ref_produto = a.ref_produto_vtex
      WHERE p.id_produto_vtex = 1
    `);

    console.log(`\n🎯 Produto com ID 1:`);
    if (product1.length > 0) {
      const p = product1[0];
      console.log(`   ID: ${p.id_produto_vtex}, Nome: ${p.name}, Anymarket ID: ${p.anymarket_id || 'Não vinculado'}`);
    } else {
      console.log('   ❌ Produto com ID 1 não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar produtos:', error);
  } finally {
    await connection.end();
  }
}

checkProducts();

// Script para diagnosticar problemas na sincronização
require('dotenv').config();

const mysql = require('mysql2/promise');

async function debugSync() {
  let connection;
  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: '-03:00',
      charset: 'utf8mb4'
    });

    console.log('🔍 Diagnosticando problemas na sincronização...');
    console.log('');

    // Buscar um produto que tenha anymarket_id
    const productQuery = `
      SELECT 
        p.id,
        p.name,
        p.ref_id,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN anymarket a ON p.ref_id = a.ref_vtex
      WHERE a.id_produto_any IS NOT NULL
      LIMIT 1
    `;

    const products = await connection.execute(productQuery);
    
    if (products[0].length === 0) {
      console.log('❌ Nenhum produto com anymarket_id encontrado');
      return;
    }

    const product = products[0][0];
    console.log('📦 Produto encontrado:');
    console.log('  ID:', product.id);
    console.log('  Nome:', product.name);
    console.log('  Ref ID:', product.ref_id);
    console.log('  Anymarket ID:', product.anymarket_id);
    console.log('');

    // Verificar título e descrição
    const titleDescriptionQuery = `
      SELECT 
        t.title,
        d.description
      FROM products_vtex p
      LEFT JOIN titles t ON p.id = t.product_id 
      LEFT JOIN descriptions d ON p.id = d.product_id 
      WHERE p.id = ?
    `;

    const titleDescriptionData = await connection.execute(titleDescriptionQuery, [product.id]);
    
    console.log('📝 Título e Descrição:');
    if (titleDescriptionData[0].length > 0) {
      const { title, description } = titleDescriptionData[0][0];
      console.log('  Título:', title || '❌ VAZIO');
      console.log('  Descrição:', description ? `${description.substring(0, 50)}...` : '❌ VAZIA');
    } else {
      console.log('  ❌ Nenhum registro encontrado nas tabelas titles/descriptions');
    }
    console.log('');

    // Verificar características - primeiro vamos ver a estrutura da tabela
    const tableStructureQuery = `DESCRIBE respostas_caracteristicas`;
    const tableStructure = await connection.execute(tableStructureQuery);
    
    console.log('🏗️  Estrutura da tabela respostas_caracteristicas:');
    tableStructure[0].forEach(column => {
      console.log(`  ${column.Field}: ${column.Type}`);
    });
    console.log('');

    // Verificar características
    const characteristicsQuery = `
      SELECT 
        rc.caracteristica,
        rc.resposta
      FROM respostas_caracteristicas rc
      LIMIT 5
    `;

    const characteristicsData = await connection.execute(characteristicsQuery);
    
    console.log('🏷️  Características encontradas:');
    if (characteristicsData[0].length > 0) {
      characteristicsData[0].forEach(char => {
        console.log(`  ${char.caracteristica}: ${char.resposta}`);
      });
    } else {
      console.log('  ❌ Nenhuma característica encontrada');
    }
    console.log('');

    // Verificar mapeamento de gênero
    let genderValue = null;
    if (characteristicsData[0].length > 0) {
      characteristicsData[0].forEach(char => {
        if (char.caracteristica && char.resposta) {
          if (char.caracteristica.toLowerCase().includes('gênero') || char.caracteristica.toLowerCase().includes('genero')) {
            const genderLower = char.resposta.toLowerCase();
            if (genderLower.includes('masculino') || genderLower.includes('male')) {
              genderValue = 'MALE';
            } else if (genderLower.includes('feminino') || genderLower.includes('female')) {
              genderValue = 'FEMALE';
            } else if (genderLower.includes('unissex') || genderLower.includes('unisex')) {
              genderValue = 'UNISEX';
            } else {
              genderValue = 'UNISEX';
            }
          }
        }
      });
    }

    console.log('👤 Mapeamento de Gênero:');
    console.log('  Valor extraído:', genderValue || '❌ NÃO ENCONTRADO');
    console.log('');

    console.log('📋 Resumo do Diagnóstico:');
    console.log('  ✅ Produto com anymarket_id:', product.anymarket_id ? 'SIM' : 'NÃO');
    console.log('  ✅ Título disponível:', titleDescriptionData[0].length > 0 && titleDescriptionData[0][0].title ? 'SIM' : 'NÃO');
    console.log('  ✅ Descrição disponível:', titleDescriptionData[0].length > 0 && titleDescriptionData[0][0].description ? 'SIM' : 'NÃO');
    console.log('  ✅ Características disponíveis:', characteristicsData[0].length > 0 ? 'SIM' : 'NÃO');
    console.log('  ✅ Gênero mapeado:', genderValue ? 'SIM' : 'NÃO');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugSync();

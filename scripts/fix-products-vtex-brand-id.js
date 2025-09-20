const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixProductsVtexBrandId() {
  let connection;
  
  try {
    console.log('🔧 Verificando e corrigindo estrutura da tabela products_vtex...');
    
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli'
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a tabela products_vtex existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products_vtex'
    `, [process.env.DB_NAME || 'meli']);

    if (tables.length === 0) {
      console.log('❌ Tabela products_vtex não encontrada!');
      return;
    }

    console.log('✅ Tabela products_vtex encontrada');

    // Verificar estrutura atual da tabela
    console.log('🔍 Verificando estrutura da tabela products_vtex...');
    const [columns] = await connection.execute('DESCRIBE products_vtex');
    
    console.log('📋 Colunas atuais:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // Verificar se existe campo brand_id
    const brandIdColumn = columns.find(col => col.Field === 'brand_id');
    
    if (!brandIdColumn) {
      console.log('❌ Campo brand_id não encontrado!');
      console.log('🔧 Tentando adicionar campo brand_id...');
      
      try {
        await connection.execute(`
          ALTER TABLE products_vtex 
          ADD COLUMN brand_id INT COMMENT 'ID da marca' 
          AFTER category_id
        `);
        console.log('✅ Campo brand_id adicionado com sucesso!');
      } catch (error) {
        console.log('❌ Erro ao adicionar campo brand_id:', error.message);
      }
    } else {
      console.log('✅ Campo brand_id já existe');
    }

    // Verificar se existe índice para brand_id
    console.log('🔍 Verificando índices...');
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM products_vtex WHERE Column_name = 'brand_id'
    `);
    
    if (indexes.length === 0) {
      console.log('🔧 Adicionando índice para brand_id...');
      try {
        await connection.execute(`
          ALTER TABLE products_vtex 
          ADD INDEX idx_brand_id (brand_id)
        `);
        console.log('✅ Índice idx_brand_id adicionado com sucesso!');
      } catch (error) {
        console.log('❌ Erro ao adicionar índice:', error.message);
      }
    } else {
      console.log('✅ Índice para brand_id já existe');
    }

    // Testar query que estava falhando
    console.log('🧪 Testando query que estava falhando...');
    try {
      const [testResult] = await connection.execute(`
        SELECT brand_id, COUNT(*) as product_count 
        FROM products_vtex 
        WHERE brand_id IS NOT NULL
        GROUP BY brand_id
        LIMIT 5
      `);
      console.log('✅ Query funcionando! Resultado:', testResult);
    } catch (error) {
      console.log('❌ Query ainda falhando:', error.message);
    }

    console.log('🎉 Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

fixProductsVtexBrandId();

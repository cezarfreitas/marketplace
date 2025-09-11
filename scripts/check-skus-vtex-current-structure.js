const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSkusVtexCurrentStructure() {
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

    // Verificar estrutura atual da tabela skus_vtex
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'skus_vtex'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'seo_data']);

    console.log('📋 Estrutura atual da tabela skus_vtex:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''} ${col.EXTRA || ''}`);
    });

    // Verificar se existe a coluna id_sku_vtex
    const hasIdSkuVtex = columns.some(col => col.COLUMN_NAME === 'id_sku_vtex');
    const hasId = columns.some(col => col.COLUMN_NAME === 'id');

    console.log('\n🔍 Análise das colunas:');
    console.log(`  - Existe coluna 'id_sku_vtex': ${hasIdSkuVtex}`);
    console.log(`  - Existe coluna 'id': ${hasId}`);

    if (hasIdSkuVtex && !hasId) {
      console.log('\n📝 AÇÃO NECESSÁRIA: Renomear coluna id_sku_vtex para id');
    } else if (hasId && !hasIdSkuVtex) {
      console.log('\n✅ Coluna já está correta (id)');
    } else if (hasId && hasIdSkuVtex) {
      console.log('\n⚠️ ATENÇÃO: Existem ambas as colunas (id e id_sku_vtex)');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
checkSkusVtexCurrentStructure();

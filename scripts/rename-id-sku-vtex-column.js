const mysql = require('mysql2/promise');
require('dotenv').config();

async function renameIdSkuVtexColumn() {
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

    // Verificar se existem foreign keys que referenciam id_sku_vtex
    console.log('🔍 Verificando foreign keys que referenciam id_sku_vtex...');
    
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME = 'skus_vtex' 
        AND REFERENCED_COLUMN_NAME = 'id_sku_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    console.log('📋 Foreign keys encontradas:');
    if (foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`  - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> skus_vtex.id_sku_vtex (${fk.CONSTRAINT_NAME})`);
      });
    } else {
      console.log('  Nenhuma foreign key encontrada');
    }

    // Verificar se existem dados na tabela
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM skus_vtex
    `);
    
    const totalRecords = countResult[0].total;
    console.log(`\n📊 Total de registros na tabela skus_vtex: ${totalRecords}`);

    if (totalRecords > 0) {
      console.log('⚠️ ATENÇÃO: A tabela contém dados. O backup é recomendado antes de continuar.');
    }

    // Executar a alteração da coluna
    console.log('\n🔧 Renomeando coluna id_sku_vtex para id...');
    
    // Primeiro, remover a chave primária
    console.log('1️⃣ Removendo chave primária...');
    await connection.execute(`
      ALTER TABLE skus_vtex DROP PRIMARY KEY
    `);
    console.log('✅ Chave primária removida');

    // Renomear a coluna
    console.log('2️⃣ Renomeando coluna id_sku_vtex para id...');
    await connection.execute(`
      ALTER TABLE skus_vtex CHANGE COLUMN id_sku_vtex id INT NOT NULL
    `);
    console.log('✅ Coluna renomeada para id');

    // Recriar a chave primária
    console.log('3️⃣ Recriando chave primária...');
    await connection.execute(`
      ALTER TABLE skus_vtex ADD PRIMARY KEY (id)
    `);
    console.log('✅ Chave primária recriada');

    // Verificar se a alteração foi bem-sucedida
    console.log('\n🔍 Verificando estrutura após alteração...');
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'skus_vtex' AND COLUMN_NAME = 'id'
    `, [process.env.DB_NAME || 'seo_data']);

    if (newColumns.length > 0) {
      const col = newColumns[0];
      console.log(`✅ Coluna 'id' criada com sucesso:`);
      console.log(`   - Tipo: ${col.DATA_TYPE}`);
      console.log(`   - Chave: ${col.COLUMN_KEY || 'Nenhuma'}`);
      console.log(`   - Null: ${col.IS_NULLABLE}`);
    } else {
      console.log('❌ Erro: Coluna id não foi criada');
    }

    console.log('\n✅ Alteração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao renomear coluna:', error);
    console.error('Detalhes:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
renameIdSkuVtexColumn();

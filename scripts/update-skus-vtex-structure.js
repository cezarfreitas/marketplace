const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSkusVtexStructure() {
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

    // Verificar se a tabela existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'skus_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length === 0) {
      console.log('❌ Tabela skus_vtex não encontrada. Criando nova tabela...');
      
      // Criar nova tabela com a estrutura correta
      const createTableSQL = `
        CREATE TABLE skus_vtex (
          id_sku_vtex INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID único do SKU VTEX',
          id_produto_vtex INT NOT NULL COMMENT 'ID do produto VTEX',
          is_active BOOLEAN DEFAULT true COMMENT 'Se o SKU está ativo',
          name VARCHAR(255) COMMENT 'Nome do SKU',
          ref_sku VARCHAR(255) COMMENT 'Reference ID do SKU',
          date_updated DATETIME COMMENT 'Data de atualização da VTEX',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
          
          -- Índices para performance
          INDEX idx_id_produto_vtex (id_produto_vtex),
          INDEX idx_is_active (is_active),
          INDEX idx_ref_sku (ref_sku),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at),
          
          -- Chave estrangeira (se a tabela products_vtex existir)
          FOREIGN KEY (id_produto_vtex) REFERENCES products_vtex(id_produto_vtex) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de SKUs VTEX com estrutura atualizada'
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela skus_vtex criada com sucesso!');
      
    } else {
      console.log('📋 Tabela skus_vtex encontrada. Verificando estrutura...');
      
      // Verificar estrutura atual
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

      // Verificar se precisa de alterações
      const expectedColumns = [
        'id_sku_vtex', 'id_produto_vtex', 'is_active', 'name', 
        'ref_sku', 'date_updated', 'created_at', 'updated_at'
      ];

      const currentColumns = columns.map(col => col.COLUMN_NAME);
      
      console.log('\n🔍 Verificando colunas esperadas...');
      const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));
      const extraColumns = currentColumns.filter(col => !expectedColumns.includes(col));

      if (missingColumns.length > 0) {
        console.log('❌ Colunas faltando:', missingColumns);
      }

      if (extraColumns.length > 0) {
        console.log('⚠️ Colunas extras encontradas:', extraColumns);
      }

      // Verificar se precisa renomear colunas
      if (currentColumns.includes('ref_id') && !currentColumns.includes('ref_sku')) {
        console.log('🔄 Renomeando coluna ref_id para ref_sku...');
        await connection.execute('ALTER TABLE skus_vtex CHANGE COLUMN ref_id ref_sku VARCHAR(255) COMMENT "Reference ID do SKU"');
        console.log('✅ Coluna ref_id renomeada para ref_sku');
      }

      if (currentColumns.includes('id') && !currentColumns.includes('id_sku_vtex')) {
        console.log('🔄 Renomeando coluna id para id_sku_vtex...');
        await connection.execute('ALTER TABLE skus_vtex CHANGE COLUMN id id_sku_vtex INT NOT NULL AUTO_INCREMENT COMMENT "ID único do SKU VTEX"');
        console.log('✅ Coluna id renomeada para id_sku_vtex');
      }

      if (currentColumns.includes('product_id') && !currentColumns.includes('id_produto_vtex')) {
        console.log('🔄 Renomeando coluna product_id para id_produto_vtex...');
        await connection.execute('ALTER TABLE skus_vtex CHANGE COLUMN product_id id_produto_vtex INT NOT NULL COMMENT "ID do produto VTEX"');
        console.log('✅ Coluna product_id renomeada para id_produto_vtex');
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Estrutura da tabela está correta!');
      }
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados na tabela...');
    const [data] = await connection.execute('SELECT COUNT(*) as total FROM skus_vtex');
    console.log(`📊 Total de SKUs: ${data[0].total}`);

    if (data[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM skus_vtex LIMIT 1');
      console.log('📋 Exemplo de dados:');
      console.log(`  - ID: ${sampleData[0].id_sku_vtex || sampleData[0].id || 'N/A'}`);
      console.log(`  - Nome: ${sampleData[0].name || 'N/A'}`);
      console.log(`  - Ref SKU: ${sampleData[0].ref_sku || sampleData[0].ref_id || 'N/A'}`);
      console.log(`  - Produto ID: ${sampleData[0].id_produto_vtex || sampleData[0].product_id || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar/atualizar estrutura:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
updateSkusVtexStructure();

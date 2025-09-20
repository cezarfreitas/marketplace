const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateStockVtexStructure() {
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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length === 0) {
      console.log('❌ Tabela stock_vtex não encontrada. Criando nova tabela...');
      
      // Criar nova tabela com a estrutura correta
      const createTableSQL = `
        CREATE TABLE stock_vtex (
          id_stock_vtex INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID único do estoque VTEX',
          id_sku_vtex INT NOT NULL COMMENT 'ID do SKU VTEX',
          warehouse_id VARCHAR(50) NOT NULL COMMENT 'ID do warehouse',
          warehouse_name VARCHAR(255) COMMENT 'Nome do warehouse',
          total_quantity INT DEFAULT 0 COMMENT 'Quantidade total em estoque',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
          
          -- Índices para performance
          INDEX idx_id_sku_vtex (id_sku_vtex),
          INDEX idx_warehouse_id (warehouse_id),
          INDEX idx_warehouse_name (warehouse_name),
          INDEX idx_total_quantity (total_quantity),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at),
          
          -- Chave estrangeira (se a tabela skus_vtex existir)
          FOREIGN KEY (id_sku_vtex) REFERENCES skus_vtex(id_sku_vtex) ON DELETE CASCADE,
          
          -- Índice único para evitar duplicatas
          UNIQUE KEY unique_sku_warehouse (id_sku_vtex, warehouse_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de estoque VTEX com estrutura atualizada'
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela stock_vtex criada com sucesso!');
      
    } else {
      console.log('📋 Tabela stock_vtex encontrada. Verificando estrutura...');
      
      // Verificar estrutura atual
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_vtex'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'seo_data']);

      console.log('📋 Estrutura atual da tabela stock_vtex:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''} ${col.EXTRA || ''}`);
      });

      // Verificar se precisa de alterações
      const expectedColumns = [
        'id_stock_vtex', 'id_sku_vtex', 'warehouse_id', 'warehouse_name', 
        'total_quantity', 'created_at', 'updated_at'
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
      if (currentColumns.includes('id') && !currentColumns.includes('id_stock_vtex')) {
        console.log('🔄 Renomeando coluna id para id_stock_vtex...');
        await connection.execute('ALTER TABLE stock_vtex CHANGE COLUMN id id_stock_vtex INT NOT NULL AUTO_INCREMENT COMMENT "ID único do estoque VTEX"');
        console.log('✅ Coluna id renomeada para id_stock_vtex');
      }

      if (currentColumns.includes('sku_id') && !currentColumns.includes('id_sku_vtex')) {
        console.log('🔄 Renomeando coluna sku_id para id_sku_vtex...');
        await connection.execute('ALTER TABLE stock_vtex CHANGE COLUMN sku_id id_sku_vtex INT NOT NULL COMMENT "ID do SKU VTEX"');
        console.log('✅ Coluna sku_id renomeada para id_sku_vtex');
      }

      if (currentColumns.includes('vtex_sku_id') && !currentColumns.includes('id_sku_vtex')) {
        console.log('🔄 Removendo coluna vtex_sku_id (redundante)...');
        await connection.execute('ALTER TABLE stock_vtex DROP COLUMN vtex_sku_id');
        console.log('✅ Coluna vtex_sku_id removida');
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Estrutura da tabela está correta!');
      }
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados na tabela...');
    const [data] = await connection.execute('SELECT COUNT(*) as total FROM stock_vtex');
    console.log(`📊 Total de registros de estoque: ${data[0].total}`);

    if (data[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM stock_vtex LIMIT 1');
      console.log('📋 Exemplo de dados:');
      console.log(`  - ID: ${sampleData[0].id_stock_vtex || sampleData[0].id || 'N/A'}`);
      console.log(`  - SKU ID: ${sampleData[0].id_sku_vtex || sampleData[0].sku_id || 'N/A'}`);
      console.log(`  - Warehouse: ${sampleData[0].warehouse_name || 'N/A'} (${sampleData[0].warehouse_id || 'N/A'})`);
      console.log(`  - Quantidade: ${sampleData[0].total_quantity || 'N/A'}`);
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
updateStockVtexStructure();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateProductsVtexStructure() {
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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length === 0) {
      console.log('❌ Tabela products_vtex não encontrada. Criando nova tabela...');
      
      // Criar nova tabela com a estrutura correta
      const createTableSQL = `
        CREATE TABLE products_vtex (
          id_produto_vtex INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID único do produto VTEX',
          name VARCHAR(255) NOT NULL COMMENT 'Nome do produto',
          department_id INT COMMENT 'ID do departamento',
          category_id INT COMMENT 'ID da categoria',
          brand_id INT COMMENT 'ID da marca',
          link_id VARCHAR(255) COMMENT 'Link ID do produto',
          ref_produto VARCHAR(255) COMMENT 'Reference ID do produto',
          is_visible BOOLEAN DEFAULT true COMMENT 'Se o produto é visível',
          description TEXT COMMENT 'Descrição completa',
          description_short TEXT COMMENT 'Descrição curta',
          release_date DATETIME COMMENT 'Data de lançamento',
          keywords TEXT COMMENT 'Palavras-chave',
          title VARCHAR(255) COMMENT 'Título do produto',
          is_active BOOLEAN DEFAULT true COMMENT 'Se o produto está ativo',
          tax_code VARCHAR(50) COMMENT 'Código de imposto',
          meta_tag_description TEXT COMMENT 'Meta tag description',
          supplier_id INT COMMENT 'ID do fornecedor',
          show_without_stock BOOLEAN DEFAULT false COMMENT 'Mostrar sem estoque',
          list_store_id INT COMMENT 'ID da loja na lista',
          adwords_remarketing_code VARCHAR(255) COMMENT 'Código AdWords Remarketing',
          lomadee_campaign_code VARCHAR(255) COMMENT 'Código da campanha Lomadee',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
          
          -- Índices para performance
          INDEX idx_name (name),
          INDEX idx_ref_produto (ref_produto),
          INDEX idx_department_id (department_id),
          INDEX idx_category_id (category_id),
          INDEX idx_brand_id (brand_id),
          INDEX idx_is_visible (is_visible),
          INDEX idx_is_active (is_active),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de produtos VTEX com estrutura atualizada'
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela products_vtex criada com sucesso!');
      
    } else {
      console.log('📋 Tabela products_vtex encontrada. Verificando estrutura...');
      
      // Verificar estrutura atual
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products_vtex'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'seo_data']);

      console.log('📋 Estrutura atual da tabela products_vtex:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''} ${col.EXTRA || ''}`);
      });

      // Verificar se precisa de alterações
      const expectedColumns = [
        'id_produto_vtex', 'name', 'department_id', 'category_id', 'brand_id', 
        'link_id', 'ref_produto', 'is_visible', 'description', 'description_short', 
        'release_date', 'keywords', 'title', 'is_active', 'tax_code', 
        'meta_tag_description', 'supplier_id', 'show_without_stock', 
        'list_store_id', 'adwords_remarketing_code', 'lomadee_campaign_code', 
        'created_at', 'updated_at'
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
      if (currentColumns.includes('ref_id') && !currentColumns.includes('ref_produto')) {
        console.log('🔄 Renomeando coluna ref_id para ref_produto...');
        await connection.execute('ALTER TABLE products_vtex CHANGE COLUMN ref_id ref_produto VARCHAR(255) COMMENT "Reference ID do produto"');
        console.log('✅ Coluna ref_id renomeada para ref_produto');
      }

      if (currentColumns.includes('id') && !currentColumns.includes('id_produto_vtex')) {
        console.log('🔄 Renomeando coluna id para id_produto_vtex...');
        await connection.execute('ALTER TABLE products_vtex CHANGE COLUMN id id_produto_vtex INT NOT NULL AUTO_INCREMENT COMMENT "ID único do produto VTEX"');
        console.log('✅ Coluna id renomeada para id_produto_vtex');
      }

      if (currentColumns.includes('vtex_id') && !currentColumns.includes('id_produto_vtex')) {
        console.log('🔄 Renomeando coluna vtex_id para id_produto_vtex...');
        await connection.execute('ALTER TABLE products_vtex CHANGE COLUMN vtex_id id_produto_vtex INT NOT NULL AUTO_INCREMENT COMMENT "ID único do produto VTEX"');
        console.log('✅ Coluna vtex_id renomeada para id_produto_vtex');
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Estrutura da tabela está correta!');
      }
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados na tabela...');
    const [data] = await connection.execute('SELECT COUNT(*) as total FROM products_vtex');
    console.log(`📊 Total de produtos: ${data[0].total}`);

    if (data[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM products_vtex LIMIT 1');
      console.log('📋 Exemplo de dados:');
      console.log(`  - ID: ${sampleData[0].id_produto_vtex || sampleData[0].id || 'N/A'}`);
      console.log(`  - Nome: ${sampleData[0].name || 'N/A'}`);
      console.log(`  - Ref ID: ${sampleData[0].ref_produto || sampleData[0].ref_id || 'N/A'}`);
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
updateProductsVtexStructure();
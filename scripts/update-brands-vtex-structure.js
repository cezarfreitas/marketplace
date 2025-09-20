const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateBrandsVtexStructure() {
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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'brands_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length === 0) {
      console.log('❌ Tabela brands_vtex não encontrada. Criando nova tabela...');
      
      // Criar nova tabela com a estrutura correta
      const createTableSQL = `
        CREATE TABLE brands_vtex (
          id_brand_vtex INT NOT NULL PRIMARY KEY COMMENT 'ID único da marca VTEX',
          name VARCHAR(255) NOT NULL COMMENT 'Nome da marca',
          is_active BOOLEAN DEFAULT true COMMENT 'Se a marca está ativa',
          title VARCHAR(255) COMMENT 'Título da marca',
          meta_tag_description TEXT COMMENT 'Meta descrição para SEO',
          image_url VARCHAR(500) COMMENT 'URL da imagem da marca',
          contexto TEXT COMMENT 'Contexto da marca',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
          
          -- Índices para performance
          INDEX idx_name (name),
          INDEX idx_is_active (is_active),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de marcas VTEX com estrutura atualizada'
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela brands_vtex criada com sucesso!');
      
    } else {
      console.log('📋 Tabela brands_vtex encontrada. Verificando estrutura...');
      
      // Verificar estrutura atual
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'brands_vtex'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'seo_data']);

      console.log('📋 Estrutura atual da tabela brands_vtex:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''} ${col.EXTRA || ''}`);
      });

      // Verificar se precisa de alterações
      const expectedColumns = [
        'id_brand_vtex', 'name', 'is_active', 'title', 
        'meta_tag_description', 'image_url', 'contexto', 'created_at', 'updated_at'
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
      if (currentColumns.includes('id') && !currentColumns.includes('id_brand_vtex')) {
        console.log('🔄 Renomeando coluna id para id_brand_vtex...');
        await connection.execute('ALTER TABLE brands_vtex CHANGE COLUMN id id_brand_vtex INT NOT NULL COMMENT "ID único da marca VTEX"');
        console.log('✅ Coluna id renomeada para id_brand_vtex');
      }

      if (currentColumns.includes('vtex_id') && !currentColumns.includes('id_brand_vtex')) {
        console.log('🔄 Renomeando coluna vtex_id para id_brand_vtex...');
        await connection.execute('ALTER TABLE brands_vtex CHANGE COLUMN vtex_id id_brand_vtex INT NOT NULL COMMENT "ID único da marca VTEX"');
        console.log('✅ Coluna vtex_id renomeada para id_brand_vtex');
      }

      // Verificar se precisa adicionar coluna contexto
      if (!currentColumns.includes('contexto')) {
        console.log('🔄 Adicionando coluna contexto...');
        await connection.execute('ALTER TABLE brands_vtex ADD COLUMN contexto TEXT COMMENT "Contexto da marca"');
        console.log('✅ Coluna contexto adicionada');
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Estrutura da tabela está correta!');
      }
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados na tabela...');
    const [data] = await connection.execute('SELECT COUNT(*) as total FROM brands_vtex');
    console.log(`📊 Total de marcas: ${data[0].total}`);

    if (data[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM brands_vtex LIMIT 1');
      console.log('📋 Exemplo de dados:');
      console.log(`  - ID: ${sampleData[0].id_brand_vtex || sampleData[0].id || sampleData[0].vtex_id || 'N/A'}`);
      console.log(`  - Nome: ${sampleData[0].name || 'N/A'}`);
      console.log(`  - Título: ${sampleData[0].title || 'N/A'}`);
      console.log(`  - Ativa: ${sampleData[0].is_active || 'N/A'}`);
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
updateBrandsVtexStructure();

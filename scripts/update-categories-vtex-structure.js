const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateCategoriesVtexStructure() {
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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length === 0) {
      console.log('❌ Tabela categories_vtex não encontrada. Criando nova tabela...');
      
      // Criar nova tabela com a estrutura correta
      const createTableSQL = `
        CREATE TABLE categories_vtex (
          id_categories_vtex INT NOT NULL PRIMARY KEY COMMENT 'ID único da categoria VTEX',
          name VARCHAR(255) NOT NULL COMMENT 'Nome da categoria',
          father_category_id INT COMMENT 'ID da categoria pai',
          title VARCHAR(255) COMMENT 'Título da categoria',
          description TEXT COMMENT 'Descrição da categoria',
          keywords TEXT COMMENT 'Palavras-chave da categoria',
          is_active BOOLEAN DEFAULT true COMMENT 'Se a categoria está ativa',
          show_in_store_front BOOLEAN DEFAULT true COMMENT 'Se deve mostrar na vitrine',
          has_children BOOLEAN DEFAULT false COMMENT 'Se a categoria tem filhos',
          contexto TEXT COMMENT 'Contexto da categoria',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
          
          -- Índices para performance
          INDEX idx_name (name),
          INDEX idx_father_category_id (father_category_id),
          INDEX idx_is_active (is_active),
          INDEX idx_show_in_store_front (show_in_store_front),
          INDEX idx_has_children (has_children),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de categorias VTEX com estrutura atualizada'
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela categories_vtex criada com sucesso!');
      
    } else {
      console.log('📋 Tabela categories_vtex encontrada. Verificando estrutura...');
      
      // Verificar estrutura atual
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories_vtex'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'seo_data']);

      console.log('📋 Estrutura atual da tabela categories_vtex:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''} ${col.EXTRA || ''}`);
      });

      // Verificar se precisa de alterações
      const expectedColumns = [
        'id_categories_vtex', 'name', 'father_category_id', 'title', 'description', 
        'keywords', 'is_active', 'show_in_store_front', 'has_children', 'contexto', 
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
      if (currentColumns.includes('id') && !currentColumns.includes('id_categories_vtex')) {
        console.log('🔄 Renomeando coluna id para id_categories_vtex...');
        await connection.execute('ALTER TABLE categories_vtex CHANGE COLUMN id id_categories_vtex INT NOT NULL COMMENT "ID único da categoria VTEX"');
        console.log('✅ Coluna id renomeada para id_categories_vtex');
      }

      if (currentColumns.includes('vtex_id') && !currentColumns.includes('id_categories_vtex')) {
        console.log('🔄 Renomeando coluna vtex_id para id_categories_vtex...');
        await connection.execute('ALTER TABLE categories_vtex CHANGE COLUMN vtex_id id_categories_vtex INT NOT NULL COMMENT "ID único da categoria VTEX"');
        console.log('✅ Coluna vtex_id renomeada para id_categories_vtex');
      }

      // Verificar se precisa adicionar coluna contexto
      if (!currentColumns.includes('contexto')) {
        console.log('🔄 Adicionando coluna contexto...');
        await connection.execute('ALTER TABLE categories_vtex ADD COLUMN contexto TEXT COMMENT "Contexto da categoria"');
        console.log('✅ Coluna contexto adicionada');
      }

      // Verificar se precisa adicionar coluna has_children
      if (!currentColumns.includes('has_children')) {
        console.log('🔄 Adicionando coluna has_children...');
        await connection.execute('ALTER TABLE categories_vtex ADD COLUMN has_children BOOLEAN DEFAULT false COMMENT "Se a categoria tem filhos"');
        console.log('✅ Coluna has_children adicionada');
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Estrutura da tabela está correta!');
      }
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados na tabela...');
    const [data] = await connection.execute('SELECT COUNT(*) as total FROM categories_vtex');
    console.log(`📊 Total de categorias: ${data[0].total}`);

    if (data[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM categories_vtex LIMIT 1');
      console.log('📋 Exemplo de dados:');
      console.log(`  - ID: ${sampleData[0].id_categories_vtex || sampleData[0].id || sampleData[0].vtex_id || 'N/A'}`);
      console.log(`  - Nome: ${sampleData[0].name || 'N/A'}`);
      console.log(`  - Título: ${sampleData[0].title || 'N/A'}`);
      console.log(`  - Ativa: ${sampleData[0].is_active || 'N/A'}`);
      console.log(`  - Tem filhos: ${sampleData[0].has_children || 'N/A'}`);
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
updateCategoriesVtexStructure();

const mysql = require('mysql2/promise');

async function safeTableCleanup() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🧹 Opções seguras para limpeza de tabelas com foreign keys...');
    
    // 1. Verificar foreign key constraints
    console.log('\n🔍 Verificando foreign key constraints...');
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'meli' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.log('📋 Foreign key constraints encontradas:');
    console.table(foreignKeys);
    
    // 2. Verificar ordem de dependências
    console.log('\n🔍 Analisando ordem de dependências...');
    
    const dependencies = {
      'brands': [],
      'categories': [],
      'products': ['brands', 'categories'],
      'skus': ['products'],
      'product_images': ['products'],
      'product_videos': ['products'],
      'product_specifications': ['products']
    };
    
    console.log('📋 Ordem de dependências (do mais independente para o mais dependente):');
    Object.entries(dependencies).forEach(([table, deps]) => {
      console.log(`  ${table}: ${deps.length > 0 ? 'depende de ' + deps.join(', ') : 'independente'}`);
    });
    
    // 3. Opções de limpeza segura
    console.log('\n🛠️ Opções de limpeza segura:');
    
    console.log('\n📋 OPÇÃO 1: Desabilitar foreign key checks temporariamente');
    console.log('```sql');
    console.log('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('TRUNCATE TABLE products;');
    console.log('TRUNCATE TABLE brands;');
    console.log('TRUNCATE TABLE categories;');
    console.log('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('```');
    
    console.log('\n📋 OPÇÃO 2: Deletar em ordem (respeitando dependências)');
    console.log('```sql');
    console.log('DELETE FROM product_specifications;');
    console.log('DELETE FROM product_images;');
    console.log('DELETE FROM product_videos;');
    console.log('DELETE FROM skus;');
    console.log('DELETE FROM products;');
    console.log('DELETE FROM brands;');
    console.log('DELETE FROM categories;');
    console.log('```');
    
    console.log('\n📋 OPÇÃO 3: Deletar apenas dados específicos');
    console.log('```sql');
    console.log('-- Deletar produtos de uma marca específica');
    console.log('DELETE FROM products WHERE brand_id = (SELECT id FROM brands WHERE name = "NomeDaMarca");');
    console.log('');
    console.log('-- Deletar produtos de uma categoria específica');
    console.log('DELETE FROM products WHERE category_id = (SELECT id FROM categories WHERE name = "NomeDaCategoria");');
    console.log('');
    console.log('-- Deletar produtos importados recentemente');
    console.log('DELETE FROM products WHERE created_at > "2024-01-01";');
    console.log('```');
    
    // 4. Verificar dados atuais
    console.log('\n📊 Dados atuais nas tabelas:');
    
    const tables = ['brands', 'categories', 'products', 'skus'];
    for (const table of tables) {
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${count[0].count} registros`);
      } catch (error) {
        console.log(`  ${table}: tabela não existe ou erro ao contar`);
      }
    }
    
    // 5. Função para limpeza segura
    console.log('\n🔧 Função para limpeza segura:');
    console.log('Esta função pode ser executada para limpar todas as tabelas de forma segura:');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Função para executar limpeza segura
async function executeSafeCleanup(option = 1) {
  let connection;
  
  try {
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🧹 Executando limpeza segura...');
    connection = await mysql.createConnection(dbConfig);
    
    if (option === 1) {
      // Opção 1: Desabilitar foreign key checks
      console.log('🔧 Desabilitando foreign key checks...');
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      console.log('🗑️ Truncando tabelas...');
      const tables = ['product_specifications', 'product_images', 'product_videos', 'skus', 'products', 'brands', 'categories'];
      
      for (const table of tables) {
        try {
          await connection.execute(`TRUNCATE TABLE ${table}`);
          console.log(`✅ Tabela ${table} truncada`);
        } catch (error) {
          console.log(`⚠️ Erro ao truncar ${table}: ${error.message}`);
        }
      }
      
      console.log('🔧 Reabilitando foreign key checks...');
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
    } else if (option === 2) {
      // Opção 2: Deletar em ordem
      console.log('🗑️ Deletando dados em ordem de dependência...');
      
      const deleteQueries = [
        'DELETE FROM product_specifications',
        'DELETE FROM product_images', 
        'DELETE FROM product_videos',
        'DELETE FROM skus',
        'DELETE FROM products',
        'DELETE FROM brands',
        'DELETE FROM categories'
      ];
      
      for (const query of deleteQueries) {
        try {
          const [result] = await connection.execute(query);
          console.log(`✅ ${query}: ${result.affectedRows} registros deletados`);
        } catch (error) {
          console.log(`⚠️ Erro em ${query}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Limpeza concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exportar funções
module.exports = { safeTableCleanup, executeSafeCleanup };

// Executar se chamado diretamente
if (require.main === module) {
  const option = process.argv[2] ? parseInt(process.argv[2]) : 0;
  
  if (option === 1 || option === 2) {
    executeSafeCleanup(option);
  } else {
    safeTableCleanup();
  }
}

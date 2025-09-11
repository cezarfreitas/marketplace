const mysql = require('mysql2/promise');

async function fixImportIssues() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // 1. Criar tabela brands se não existir
    console.log('\n🔧 Criando tabela brands...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS brands (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vtex_id INT UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_vtex_id (vtex_id),
          INDEX idx_name (name),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Marcas dos produtos'
      `);
      console.log('✅ Tabela brands criada/verificada');
    } catch (error) {
      console.log(`❌ Erro ao criar tabela brands: ${error.message}`);
    }

    // 2. Criar tabela categories se não existir
    console.log('\n🔧 Criando tabela categories...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vtex_id INT UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          parent_id INT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_vtex_id (vtex_id),
          INDEX idx_name (name),
          INDEX idx_parent_id (parent_id),
          INDEX idx_is_active (is_active),
          
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Categorias dos produtos'
      `);
      console.log('✅ Tabela categories criada/verificada');
    } catch (error) {
      console.log(`❌ Erro ao criar tabela categories: ${error.message}`);
    }

    // 3. Criar tabela system_config se não existir
    console.log('\n🔧 Criando tabela system_config...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(255) UNIQUE NOT NULL,
          config_value TEXT,
          description TEXT,
          is_encrypted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Configurações do sistema'
      `);
      console.log('✅ Tabela system_config criada/verificada');
    } catch (error) {
      console.log(`❌ Erro ao criar tabela system_config: ${error.message}`);
    }

    // 4. Inserir configurações da VTEX na tabela system_config
    console.log('\n🔧 Inserindo configurações da VTEX...');
    const vtexConfigs = [
      { key: 'VTEX_ACCOUNT_NAME', value: 'seu_account_name', description: 'Nome da conta VTEX' },
      { key: 'VTEX_ENVIRONMENT', value: 'vtexcommercestable', description: 'Ambiente da VTEX' },
      { key: 'VTEX_APP_KEY', value: 'sua_app_key', description: 'Chave da aplicação VTEX' },
      { key: 'VTEX_APP_TOKEN', value: 'seu_app_token', description: 'Token da aplicação VTEX' }
    ];

    for (const config of vtexConfigs) {
      try {
        await connection.execute(`
          INSERT INTO system_config (config_key, config_value, description) 
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          config_value = VALUES(config_value),
          description = VALUES(description),
          updated_at = CURRENT_TIMESTAMP
        `, [config.key, config.value, config.description]);
        console.log(`✅ Configuração ${config.key} inserida/atualizada`);
      } catch (error) {
        console.log(`❌ Erro ao inserir configuração ${config.key}: ${error.message}`);
      }
    }

    // 5. Verificar se há dados nas tabelas brands e categories
    console.log('\n🔍 Verificando dados nas tabelas...');
    
    const [brandsCount] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    console.log(`📊 Total de marcas: ${brandsCount[0].total}`);
    
    const [categoriesCount] = await connection.execute('SELECT COUNT(*) as total FROM categories');
    console.log(`📊 Total de categorias: ${categoriesCount[0].total}`);

    // 6. Se não há dados, inserir dados básicos
    if (brandsCount[0].total === 0) {
      console.log('\n🔧 Inserindo marcas básicas...');
      try {
        await connection.execute(`
          INSERT INTO brands (vtex_id, name) VALUES 
          (2000056, 'Ecko'),
          (2000001, 'Marca Exemplo 1'),
          (2000002, 'Marca Exemplo 2')
        `);
        console.log('✅ Marcas básicas inseridas');
      } catch (error) {
        console.log(`❌ Erro ao inserir marcas: ${error.message}`);
      }
    }

    if (categoriesCount[0].total === 0) {
      console.log('\n🔧 Inserindo categorias básicas...');
      try {
        await connection.execute(`
          INSERT INTO categories (vtex_id, name) VALUES 
          (15301, 'Camisetas'),
          (15277, 'Roupas Masculinas'),
          (15000, 'Vestuário')
        `);
        console.log('✅ Categorias básicas inseridas');
      } catch (error) {
        console.log(`❌ Erro ao inserir categorias: ${error.message}`);
      }
    }

    // 7. Verificar relacionamentos finais
    console.log('\n🔍 Verificação final...');
    const [finalStats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM products_vtex) as total_products,
        (SELECT COUNT(*) FROM skus_vtex) as total_skus,
        (SELECT COUNT(*) FROM images_vtex) as total_images,
        (SELECT COUNT(*) FROM brands) as total_brands,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM system_config) as total_configs
    `);
    
    const stats = finalStats[0];
    console.log('📊 Estatísticas finais:');
    console.log(`   Produtos: ${stats.total_products}`);
    console.log(`   SKUs: ${stats.total_skus}`);
    console.log(`   Imagens: ${stats.total_images}`);
    console.log(`   Marcas: ${stats.total_brands}`);
    console.log(`   Categorias: ${stats.total_categories}`);
    console.log(`   Configurações: ${stats.total_configs}`);

    console.log('\n🎉 Correções aplicadas com sucesso!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Configure as variáveis de ambiente da VTEX no arquivo .env');
    console.log('   2. Atualize as configurações na tabela system_config com os valores reais');
    console.log('   3. Teste a importação na página /import');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

fixImportIssues();

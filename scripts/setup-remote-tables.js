const { executeQuery, testConnection, tableExists } = require('../src/lib/database.ts');

async function setupRemoteTables() {
  try {
    console.log('🔄 Testando conexão com banco remoto...');
    const connected = await testConnection();
    
    if (!connected) {
      console.log('❌ Não foi possível conectar ao banco de dados');
      return;
    }

    console.log('✅ Conexão estabelecida!');

    // Verificar tabelas existentes
    const brandsExists = await tableExists('brands');
    const configExists = await tableExists('system_config');

    console.log('📊 Status das tabelas:');
    console.log(`  - brands: ${brandsExists ? '✅ Existe' : '❌ Não existe'}`);
    console.log(`  - system_config: ${configExists ? '✅ Existe' : '❌ Não existe'}`);

    // Criar tabela system_config se não existir
    if (!configExists) {
      console.log('🔧 Criando tabela system_config...');
      await executeQuery(`
        CREATE TABLE system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(100) NOT NULL UNIQUE,
          config_value TEXT,
          description TEXT,
          is_encrypted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabela system_config criada!');
    }

    // Criar tabela brands se não existir
    if (!brandsExists) {
      console.log('🔧 Criando tabela brands...');
      await executeQuery(`
        CREATE TABLE brands (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vtex_id INT NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          title VARCHAR(255),
          meta_tag_description TEXT,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_vtex_id (vtex_id),
          INDEX idx_name (name),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabela brands criada!');
    }

    // Inserir configurações padrão se não existirem
    console.log('🔧 Verificando configurações padrão...');
    const existingConfigs = await executeQuery('SELECT config_key FROM system_config');
    const existingKeys = existingConfigs.map(row => row.config_key);

    const defaultConfigs = [
      { key: 'vtex_account_name', value: '', description: 'Nome da conta VTEX' },
      { key: 'vtex_environment', value: 'vtexcommercestable', description: 'Ambiente da API VTEX' },
      { key: 'vtex_app_key', value: '', description: 'App Key da API VTEX' },
      { key: 'vtex_app_token', value: '', description: 'App Token da API VTEX' }
    ];

    for (const config of defaultConfigs) {
      if (!existingKeys.includes(config.key)) {
        await executeQuery(`
          INSERT INTO system_config (config_key, config_value, description) 
          VALUES (?, ?, ?)
        `, [config.key, config.value, config.description]);
        console.log(`✅ Configuração ${config.key} inserida`);
      } else {
        console.log(`ℹ️ Configuração ${config.key} já existe`);
      }
    }

    console.log('🎉 Setup concluído com sucesso!');
    console.log('');
    console.log('📊 Tabelas configuradas:');
    console.log('  - system_config (configurações do sistema)');
    console.log('  - brands (marcas da VTEX)');

  } catch (error) {
    console.error('❌ Erro durante o setup:', error.message);
  }
}

setupRemoteTables();

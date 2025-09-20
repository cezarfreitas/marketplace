const mysql = require('mysql2/promise');
require('dotenv').config();

async function createMissingTables() {
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'seo_db',
      acquireTimeoutMillis: 60000,
      timeout: 60000
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar e criar tabela anymarket_sync_logs
    console.log('🔍 Verificando tabela anymarket_sync_logs...');
    try {
      await connection.execute('SELECT 1 FROM anymarket_sync_logs LIMIT 1');
      console.log('✅ Tabela anymarket_sync_logs já existe');
    } catch (error) {
      console.log('❌ Tabela anymarket_sync_logs não existe, criando...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS anymarket_sync_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          anymarket_id VARCHAR(255),
          title VARCHAR(500),
          description TEXT,
          success BOOLEAN NOT NULL DEFAULT true,
          response_data JSON,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_product_id (product_id),
          INDEX idx_anymarket_id (anymarket_id),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('✅ Tabela anymarket_sync_logs criada');
    }

    // Verificar e criar tabela descriptions
    console.log('🔍 Verificando tabela descriptions...');
    try {
      await connection.execute('SELECT 1 FROM descriptions LIMIT 1');
      console.log('✅ Tabela descriptions já existe');
    } catch (error) {
      console.log('❌ Tabela descriptions não existe, criando...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS descriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          description TEXT NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_product_description (product_id),
          INDEX idx_product_id (product_id)
        )
      `);
      console.log('✅ Tabela descriptions criada');
    }

    // Verificar e criar tabela respostas_caracteristicas
    console.log('🔍 Verificando tabela respostas_caracteristicas...');
    try {
      await connection.execute('SELECT 1 FROM respostas_caracteristicas LIMIT 1');
      console.log('✅ Tabela respostas_caracteristicas já existe');
    } catch (error) {
      console.log('❌ Tabela respostas_caracteristicas não existe, criando...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS respostas_caracteristicas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL,
          caracteristica VARCHAR(255) NOT NULL,
          resposta TEXT,
          confianca DECIMAL(5,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_produto_id (produto_id),
          UNIQUE KEY unique_produto_caracteristica (produto_id, caracteristica)
        )
      `);
      console.log('✅ Tabela respostas_caracteristicas criada');
    }

    // Verificar e criar tabela analise_imagens
    console.log('🔍 Verificando tabela analise_imagens...');
    try {
      await connection.execute('SELECT 1 FROM analise_imagens LIMIT 1');
      console.log('✅ Tabela analise_imagens já existe');
    } catch (error) {
      console.log('❌ Tabela analise_imagens não existe, criando...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS analise_imagens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_produto_vtex INT NOT NULL,
          analysis_result JSON,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_id_produto_vtex (id_produto_vtex),
          INDEX idx_id_produto_vtex (id_produto_vtex)
        )
      `);
      console.log('✅ Tabela analise_imagens criada');
    }

    // Verificar e criar tabela titles
    console.log('🔍 Verificando tabela titles...');
    try {
      await connection.execute('SELECT 1 FROM titles LIMIT 1');
      console.log('✅ Tabela titles já existe');
    } catch (error) {
      console.log('❌ Tabela titles não existe, criando...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS titles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_product_vtex INT NOT NULL,
          title VARCHAR(500) NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_id_product_vtex (id_product_vtex),
          INDEX idx_id_product_vtex (id_product_vtex)
        )
      `);
      console.log('✅ Tabela titles criada');
    }

    // Verificar contagens das tabelas
    console.log('\n📊 Contagens das tabelas:');
    const tables = ['anymarket_sync_logs', 'descriptions', 'respostas_caracteristicas', 'analise_imagens', 'titles'];
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${rows[0].count} registros`);
      } catch (error) {
        console.log(`  ${table}: erro ao contar - ${error.message}`);
      }
    }

    console.log('\n✅ Todas as tabelas foram verificadas/criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

createMissingTables();

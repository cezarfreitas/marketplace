const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  charset: 'utf8mb4',
};

async function createBrandsTable() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado com sucesso!');
    
    console.log('🔄 Criando tabela de marcas...');
    
    // Criar tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        title VARCHAR(255),
        meta_tag_description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Tabela brands criada');
    
    // Criar índices
    console.log('🔄 Criando índices...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_brands_vtex_id ON brands(vtex_id)',
      'CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name)',
      'CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await connection.execute(indexSQL);
        console.log('✅ Índice criado');
      } catch (error) {
        // Ignorar erro se o índice já existir
        if (!error.message.includes('Duplicate key name')) {
          console.log('⚠️ Aviso ao criar índice:', error.message);
        }
      }
    }
    
    console.log('✅ Tabela de marcas criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const [tables] = await connection.execute("SHOW TABLES LIKE 'brands'");
    if (tables.length > 0) {
      console.log('✅ Tabela "brands" confirmada no banco de dados');
      
      // Mostrar estrutura da tabela
      const [columns] = await connection.execute("DESCRIBE brands");
      console.log('\n📋 Estrutura da tabela brands:');
      console.table(columns);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

// Executar
createBrandsTable();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3342'),
  user: process.env.DB_USER || 'seo_data',
  password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
  database: process.env.DB_NAME || 'seo_data',
  charset: 'utf8mb4'
};

async function setupAdminUser() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');

    // Verificar se a tabela usuarios existe
    console.log('🔍 Verificando se a tabela usuarios existe...');
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'usuarios'
    `, [dbConfig.database]);

    if (tables[0].count === 0) {
      console.log('📋 Criando tabela usuarios...');
      
      const createTableSQL = `
        CREATE TABLE usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          senha VARCHAR(255) NOT NULL,
          role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP NULL,
          login_attempts INT DEFAULT 0,
          locked_until TIMESTAMP NULL,
          avatar_url TEXT,
          telefone VARCHAR(20),
          departamento VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_email (email),
          INDEX idx_role (role),
          INDEX idx_is_active (is_active),
          INDEX idx_last_login (last_login),
          INDEX idx_created_at (created_at)
          
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Tabela usuarios criada com sucesso!');
    } else {
      console.log('✅ Tabela usuarios já existe');
    }

    // Verificar se o usuário admin já existe
    console.log('🔍 Verificando se o usuário admin existe...');
    const [existingUser] = await connection.execute(
      'SELECT id, email FROM usuarios WHERE email = ?',
      ['admin@admin.com']
    );

    if (existingUser.length > 0) {
      console.log('👤 Usuário admin já existe, atualizando senha...');
      
      // Criar hash da senha "admin"
      const password = 'admin';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Atualizar senha do usuário existente
      await connection.execute(
        'UPDATE usuarios SET senha = ?, role = ?, is_active = 1, updated_at = NOW() WHERE email = ?',
        [passwordHash, 'admin', 'admin@admin.com']
      );
      
      console.log('✅ Senha do usuário admin atualizada!');
    } else {
      console.log('👤 Criando novo usuário admin...');
      
      // Criar hash da senha "admin"
      const password = 'admin';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Inserir usuário admin
      await connection.execute(`
        INSERT INTO usuarios (nome, email, senha, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 1, NOW(), NOW())
      `, ['Administrador', 'admin@admin.com', passwordHash]);

      console.log('✅ Usuário admin criado com sucesso!');
    }

    // Mostrar informações do usuário admin
    console.log('\n📋 Informações do usuário admin:');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Senha: admin');
    console.log('👑 Role: admin');
    console.log('✅ Status: ativo');

    // Verificar estrutura da tabela
    console.log('\n📋 Estrutura da tabela usuarios:');
    const [structure] = await connection.execute('DESCRIBE usuarios');
    console.table(structure);
    
    // Mostrar usuário criado
    console.log('\n👤 Dados do usuário admin:');
    const [adminUser] = await connection.execute(`
      SELECT id, nome, email, role, is_active, created_at, updated_at 
      FROM usuarios 
      WHERE email = 'admin@admin.com'
    `);
    console.table(adminUser);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
}

// Executar o script
setupAdminUser();

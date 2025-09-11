// Script para atualizar o usuário admin com credenciais simplificadas
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Configuração do banco de dados seo_data
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3342,
  user: 'seo_data',
  password: '54779042baaa70be95c0',
  database: 'seo_data',
  charset: 'utf8mb4'
};

async function updateAdminUser() {
  console.log('🚀 Atualizando usuário admin...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');
    
    // Verificar se o usuário admin existe
    const [existingUsers] = await connection.execute(`
      SELECT id, nome, email FROM usuarios WHERE email = 'admin@seo.com'
    `);
    
    if (existingUsers.length > 0) {
      console.log('📝 Usuário admin encontrado, atualizando...');
      
      // Fazer hash da nova senha "admin"
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      // Atualizar usuário admin
      await connection.execute(`
        UPDATE usuarios 
        SET nome = 'Administrador', email = 'admin', senha = ?, role = 'admin', is_active = 1
        WHERE email = 'admin@seo.com'
      `, [hashedPassword]);
      
      console.log('✅ Usuário admin atualizado com sucesso!');
      
    } else {
      console.log('📝 Criando novo usuário admin...');
      
      // Fazer hash da senha "admin"
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      // Inserir novo usuário admin
      await connection.execute(`
        INSERT INTO usuarios (nome, email, senha, role, is_active) 
        VALUES ('Administrador', 'admin', ?, 'admin', 1)
      `, [hashedPassword]);
      
      console.log('✅ Usuário admin criado com sucesso!');
    }
    
    // Verificar o usuário atualizado
    const [updatedUser] = await connection.execute(`
      SELECT id, nome, email, role, is_active, created_at 
      FROM usuarios 
      WHERE email = 'admin'
    `);
    
    if (updatedUser.length > 0) {
      console.log('\n👤 Usuário admin atualizado:');
      console.table(updatedUser);
      
      // Testar login
      const user = updatedUser[0];
      const [userWithPassword] = await connection.execute(`
        SELECT senha FROM usuarios WHERE id = ?
      `, [user.id]);
      
      if (userWithPassword.length > 0) {
        const isValidPassword = await bcrypt.compare('admin', userWithPassword[0].senha);
        console.log(`🔐 Teste de senha: ${isValidPassword ? '✅ Válida' : '❌ Inválida'}`);
      }
      
      console.log('\n📋 Credenciais de acesso:');
      console.log('   Email: admin');
      console.log('   Senha: admin');
      
    } else {
      console.log('❌ Erro ao verificar usuário admin');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

updateAdminUser();

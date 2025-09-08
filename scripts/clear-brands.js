const mysql = require('mysql2/promise');

async function clearBrands() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3349,
    user: 'meli',
    password: '7dd3e59ddb3c3a5da0e3',
    database: 'meli'
  });

  try {
    console.log('🗑️ Limpando tabela de marcas...');
    
    // Deletar todas as marcas
    const [result] = await connection.execute('DELETE FROM brands');
    console.log(`✅ ${result.affectedRows} marcas removidas`);
    
    // Resetar auto_increment
    await connection.execute('ALTER TABLE brands AUTO_INCREMENT = 1');
    console.log('✅ Auto increment resetado');
    
    // Verificar se está vazio
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    console.log(`📊 Total de marcas: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

clearBrands();

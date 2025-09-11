const mysql = require('mysql2/promise');

async function checkAnaliseImagens() {
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

    console.log('🔍 Verificando dados na tabela analise_imagens...');
    
    const [data] = await connection.execute('SELECT id_produto, contextualizacao, created_at FROM analise_imagens ORDER BY created_at DESC LIMIT 5');
    
    console.log('📊 Dados encontrados:', data.length);
    data.forEach(row => {
      console.log(`- Produto ID: ${row.id_produto}, Criado: ${row.created_at}`);
    });

    if (data.length === 0) {
      console.log('⚠️ Nenhum dado encontrado na tabela analise_imagens');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkAnaliseImagens();

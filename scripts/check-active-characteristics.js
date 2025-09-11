const mysql = require('mysql2/promise');

async function checkActiveCharacteristics() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Buscar características ativas
    console.log('🔍 Buscando características ativas...');
    
    const [caracteristicas] = await connection.execute(`
      SELECT caracteristica, pergunta_ia, valores_possiveis 
      FROM caracteristicas 
      WHERE is_active = TRUE 
      ORDER BY caracteristica
    `);

    if (caracteristicas && caracteristicas.length > 0) {
      console.log(`\n📋 Características ativas (${caracteristicas.length}):`);
      
      caracteristicas.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.caracteristica}`);
        console.log(`   Pergunta: ${c.pergunta_ia}`);
        if (c.valores_possiveis) {
          console.log(`   Valores: ${c.valores_possiveis}`);
        }
      });

      // Preparar texto para incluir no prompt
      console.log('\n📝 Texto para incluir no prompt:');
      console.log('\n**PERGUNTAS ADICIONAIS PARA ANÁLISE:**');
      caracteristicas.forEach((c, i) => {
        console.log(`${i + 1}. ${c.caracteristica}: ${c.pergunta_ia}`);
        if (c.valores_possiveis) {
          console.log(`   Valores possíveis: ${c.valores_possiveis}`);
        }
      });
    } else {
      console.log('⚠️ Nenhuma característica ativa encontrada');
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

checkActiveCharacteristics();

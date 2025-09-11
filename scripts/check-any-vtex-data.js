const mysql = require('mysql2/promise');

async function checkAnyVtexData() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔍 Verificando dados da tabela any_vtex...');
    
    const [data] = await connection.execute('SELECT * FROM any_vtex');
    console.log('📊 Dados na tabela any_vtex:');
    
    if (data.length === 0) {
      console.log('❌ Nenhum dado encontrado na tabela');
    } else {
      data.forEach(row => {
        console.log(`  - ID_ANY: ${row.id_any}, REF_ID: ${row.ref_id}`);
      });
    }
    
    // Verificar estrutura da tabela
    const [columns] = await connection.execute('DESCRIBE any_vtex');
    console.log('\n📋 Estrutura da tabela:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkAnyVtexData();

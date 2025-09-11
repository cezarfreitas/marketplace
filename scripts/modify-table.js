const mysql = require('mysql2/promise');

async function modifyTable() {
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

    // 1. Verificar estrutura atual
    console.log('\n📊 Estrutura atual da tabela respostas_caracteristicas:');
    const [structure] = await connection.execute('DESCRIBE respostas_caracteristicas');
    structure.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    // 2. Adicionar coluna caracteristica
    console.log('\n➕ Adicionando coluna caracteristica...');
    await connection.execute(`
      ALTER TABLE respostas_caracteristicas 
      ADD COLUMN caracteristica VARCHAR(255) NOT NULL COMMENT 'Nome da característica' 
      AFTER produto_id
    `);
    console.log('✅ Coluna caracteristica adicionada!');

    // 3. Atualizar dados com nomes das características
    console.log('\n🔄 Atualizando dados com nomes das características...');
    const [updateResult] = await connection.execute(`
      UPDATE respostas_caracteristicas rc 
      INNER JOIN caracteristicas c ON rc.caracteristica_id = c.id 
      SET rc.caracteristica = c.caracteristica
    `);
    console.log(`✅ ${updateResult.affectedRows} registros atualizados!`);

    // 4. Verificar dados atualizados
    console.log('\n📋 Verificando dados atualizados:');
    const [data] = await connection.execute(`
      SELECT id, caracteristica, produto_id, resposta 
      FROM respostas_caracteristicas 
      LIMIT 5
    `);
    data.forEach(row => {
      console.log(`- ID: ${row.id}, Característica: ${row.caracteristica}, Produto: ${row.produto_id}`);
    });

    // 5. Remover coluna caracteristica_id
    console.log('\n🗑️ Removendo coluna caracteristica_id...');
    await connection.execute('ALTER TABLE respostas_caracteristicas DROP COLUMN caracteristica_id');
    console.log('✅ Coluna caracteristica_id removida!');

    // 6. Verificar estrutura final
    console.log('\n📊 Estrutura final da tabela respostas_caracteristicas:');
    const [finalStructure] = await connection.execute('DESCRIBE respostas_caracteristicas');
    finalStructure.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    // 7. Verificar dados finais
    console.log('\n📋 Dados finais:');
    const [finalData] = await connection.execute(`
      SELECT id, caracteristica, produto_id, resposta, tokens_usados, created_at 
      FROM respostas_caracteristicas 
      LIMIT 3
    `);
    finalData.forEach(row => {
      console.log(`- ID: ${row.id}, Característica: ${row.caracteristica}, Produto: ${row.produto_id}`);
      console.log(`  Resposta: ${row.resposta.substring(0, 50)}...`);
    });

    console.log('\n✅ Modificação da tabela concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

modifyTable();
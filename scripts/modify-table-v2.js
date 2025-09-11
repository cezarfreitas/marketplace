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

    // 1. Verificar chaves estrangeiras
    console.log('\n🔍 Verificando chaves estrangeiras...');
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
      AND TABLE_NAME = 'respostas_caracteristicas'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (foreignKeys.length > 0) {
      console.log('Chaves estrangeiras encontradas:');
      foreignKeys.forEach(fk => {
        console.log(`- ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
      
      // Remover chaves estrangeiras
      for (const fk of foreignKeys) {
        console.log(`\n🗑️ Removendo chave estrangeira ${fk.CONSTRAINT_NAME}...`);
        await connection.execute(`ALTER TABLE respostas_caracteristicas DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        console.log(`✅ Chave estrangeira ${fk.CONSTRAINT_NAME} removida!`);
      }
    } else {
      console.log('Nenhuma chave estrangeira encontrada.');
    }

    // 2. Verificar estrutura atual
    console.log('\n📊 Estrutura atual da tabela respostas_caracteristicas:');
    const [structure] = await connection.execute('DESCRIBE respostas_caracteristicas');
    structure.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    // 3. Atualizar dados com nomes das características (se ainda existir caracteristica_id)
    const hasCaracteristicaId = structure.some(col => col.Field === 'caracteristica_id');
    if (hasCaracteristicaId) {
      console.log('\n🔄 Atualizando dados com nomes das características...');
      const [updateResult] = await connection.execute(`
        UPDATE respostas_caracteristicas rc 
        INNER JOIN caracteristicas c ON rc.caracteristica_id = c.id 
        SET rc.caracteristica = c.caracteristica
      `);
      console.log(`✅ ${updateResult.affectedRows} registros atualizados!`);
    }

    // 4. Remover coluna caracteristica_id
    if (hasCaracteristicaId) {
      console.log('\n🗑️ Removendo coluna caracteristica_id...');
      await connection.execute('ALTER TABLE respostas_caracteristicas DROP COLUMN caracteristica_id');
      console.log('✅ Coluna caracteristica_id removida!');
    }

    // 5. Verificar estrutura final
    console.log('\n📊 Estrutura final da tabela respostas_caracteristicas:');
    const [finalStructure] = await connection.execute('DESCRIBE respostas_caracteristicas');
    finalStructure.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    // 6. Verificar dados finais
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

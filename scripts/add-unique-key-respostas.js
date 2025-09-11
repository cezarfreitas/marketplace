const mysql = require('mysql2/promise');

async function addUniqueKey() {
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

    // 1. Verificar chaves únicas existentes
    console.log('\n📊 Verificando chaves únicas existentes...');
    const [existingKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        ORDINAL_POSITION
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
        AND TABLE_NAME = 'respostas_caracteristicas' 
        AND CONSTRAINT_NAME LIKE '%unique%'
      ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
    `);
    
    if (existingKeys.length > 0) {
      console.log('🔍 Chaves únicas encontradas:');
      existingKeys.forEach(key => {
        console.log(`- ${key.CONSTRAINT_NAME}: ${key.COLUMN_NAME} (posição ${key.ORDINAL_POSITION})`);
      });
    } else {
      console.log('❌ Nenhuma chave única encontrada');
    }

    // 2. Verificar se a chave única composta já existe
    const [compositeKey] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        ORDINAL_POSITION
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
        AND TABLE_NAME = 'respostas_caracteristicas' 
        AND CONSTRAINT_NAME = 'unique_produto_caracteristica'
      ORDER BY ORDINAL_POSITION
    `);

    if (compositeKey.length > 0) {
      console.log('\n✅ Chave única composta já existe!');
      compositeKey.forEach(key => {
        console.log(`- ${key.COLUMN_NAME} (posição ${key.ORDINAL_POSITION})`);
      });
      return;
    }

    // 3. Remover chaves únicas existentes se necessário
    console.log('\n🗑️ Removendo chaves únicas existentes...');
    const [keysToRemove] = await connection.execute(`
      SELECT DISTINCT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
        AND TABLE_NAME = 'respostas_caracteristicas' 
        AND CONSTRAINT_NAME LIKE '%unique%'
        AND CONSTRAINT_NAME != 'unique_produto_caracteristica'
    `);

    for (const key of keysToRemove) {
      try {
        await connection.execute(`ALTER TABLE respostas_caracteristicas DROP INDEX ${key.CONSTRAINT_NAME}`);
        console.log(`✅ Removida chave única: ${key.CONSTRAINT_NAME}`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover ${key.CONSTRAINT_NAME}: ${error.message}`);
      }
    }

    // 4. Adicionar nova chave única composta
    console.log('\n➕ Adicionando chave única composta (produto_id, caracteristica)...');
    await connection.execute(`
      ALTER TABLE respostas_caracteristicas 
      ADD UNIQUE KEY unique_produto_caracteristica (produto_id, caracteristica)
    `);
    console.log('✅ Chave única composta adicionada!');

    // 5. Verificar se foi adicionada corretamente
    console.log('\n📋 Verificando chave única adicionada...');
    const [newKey] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        ORDINAL_POSITION
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
        AND TABLE_NAME = 'respostas_caracteristicas' 
        AND CONSTRAINT_NAME = 'unique_produto_caracteristica'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('✅ Chave única composta configurada:');
    newKey.forEach(key => {
      console.log(`- ${key.COLUMN_NAME} (posição ${key.ORDINAL_POSITION})`);
    });

    console.log('\n🎉 Chave única composta configurada com sucesso!');
    console.log('💡 Agora o UPSERT funcionará corretamente na regeneração de características.');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada.');
    }
  }
}

// Executar o script
addUniqueKey();

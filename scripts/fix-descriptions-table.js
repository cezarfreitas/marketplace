const mysql = require('mysql2/promise');

async function fixDescriptionsTable() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar se o campo status tem valor padrão
    console.log('🔍 Verificando campo status na tabela descriptions...');
    const [structure] = await connection.execute('DESCRIBE descriptions');
    const statusField = structure.find(field => field.Field === 'status');
    
    if (statusField) {
      console.log(`   Campo status: ${statusField.Type}, Default: ${statusField.Default || 'NULL'}`);
      
      if (!statusField.Default) {
        console.log('🔧 Adicionando valor padrão para o campo status...');
        try {
          await connection.execute(`
            ALTER TABLE descriptions 
            MODIFY COLUMN status VARCHAR(50) DEFAULT 'generated'
          `);
          console.log('✅ Valor padrão adicionado ao campo status');
        } catch (error) {
          console.log('❌ Erro ao modificar campo status:', error.message);
        }
      }
    }

    // Verificar se há problemas com outros campos
    console.log('\n🔍 Verificando outros campos...');
    const requiredFields = [
      'agent_id', 'agent_name', 'generation_duration_ms', 'error_message'
    ];
    
    for (const field of requiredFields) {
      const fieldInfo = structure.find(f => f.Field === field);
      if (fieldInfo) {
        console.log(`   ✅ ${field}: ${fieldInfo.Type}`);
      } else {
        console.log(`   ❌ ${field}: Campo não encontrado`);
      }
    }

    // Testar inserção simples
    console.log('\n🧪 Testando inserção simples...');
    try {
      const testInsert = `
        INSERT INTO descriptions (
          product_id, title, description, status
        ) VALUES (?, ?, ?, ?)
      `;
      
      await connection.execute(testInsert, [
        999999, // ID de teste
        'Teste',
        'Descrição de teste',
        'test'
      ]);
      
      console.log('✅ Inserção de teste funcionou!');
      
      // Remover o registro de teste
      await connection.execute('DELETE FROM descriptions WHERE product_id = 999999');
      console.log('🗑️ Registro de teste removido');
      
    } catch (insertError) {
      console.log('❌ Erro na inserção de teste:', insertError.message);
    }

    // Verificar estrutura final
    console.log('\n📊 Estrutura final da tabela descriptions:');
    const [finalStructure] = await connection.execute('DESCRIBE descriptions');
    finalStructure.forEach(field => {
      console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Default ? `DEFAULT '${field.Default}'` : ''} ${field.Key ? `[${field.Key}]` : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDescriptionsTable();

const mysql = require('mysql2/promise');

async function updateBrandsTable() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados remoto...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados remoto!');

    // Verificar estrutura atual da tabela
    console.log('📊 Verificando estrutura atual da tabela brands...');
    const [columns] = await connection.execute('DESCRIBE brands');
    console.log('Colunas existentes:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    // Adicionar novas colunas para dados auxiliares
    const newColumns = [
      {
        name: 'brand_history',
        type: 'TEXT',
        description: 'História/Identidade da Marca'
      },
      {
        name: 'target_audience',
        type: 'TEXT',
        description: 'Público-Alvo'
      },
      {
        name: 'language_type',
        type: 'VARCHAR(100)',
        description: 'Tipo de Linguagem'
      },
      {
        name: 'consumption_behavior',
        type: 'TEXT',
        description: 'Comportamento de Consumo'
      },
      {
        name: 'visual_style',
        type: 'TEXT',
        description: 'Estilo Visual/Emocional'
      },
      {
        name: 'auxiliary_data_generated',
        type: 'BOOLEAN DEFAULT FALSE',
        description: 'Indica se os dados auxiliares foram gerados'
      }
    ];

    console.log('🔧 Adicionando novas colunas...');
    
    for (const column of newColumns) {
      try {
        await connection.execute(`
          ALTER TABLE brands 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Coluna ${column.name} adicionada: ${column.description}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Coluna ${column.name} já existe`);
        } else {
          console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
        }
      }
    }

    // Verificar estrutura final
    console.log('📊 Estrutura final da tabela brands:');
    const [finalColumns] = await connection.execute('DESCRIBE brands');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    console.log('🎉 Tabela brands atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

updateBrandsTable();

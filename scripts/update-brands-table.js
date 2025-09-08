const mysql = require('mysql2/promise');

async function updateBrandsTable() {
  let connection;
  
  try {
    console.log('🔗 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      timezone: '-03:00',
      charset: 'utf8mb4'
    });

    console.log('✅ Conectado ao banco de dados');

    // Adicionar colunas que estão faltando
    console.log('\n🔧 Adicionando colunas faltantes à tabela brands...');
    
    const columnsToAdd = [
      {
        name: 'brand_history',
        definition: 'TEXT NULL COMMENT "Histórico e background da marca"'
      },
      {
        name: 'target_audience',
        definition: 'TEXT NULL COMMENT "Público-alvo da marca"'
      },
      {
        name: 'language_type',
        definition: 'VARCHAR(50) NULL COMMENT "Tipo de linguagem da marca"'
      },
      {
        name: 'consumption_behavior',
        definition: 'TEXT NULL COMMENT "Comportamento de consumo do público"'
      },
      {
        name: 'visual_style',
        definition: 'TEXT NULL COMMENT "Estilo visual da marca"'
      },
      {
        name: 'auxiliary_data_generated',
        definition: 'BOOLEAN DEFAULT FALSE COMMENT "Se dados auxiliares foram gerados"'
      },
      {
        name: 'brand_analysis',
        definition: 'LONGTEXT NULL COMMENT "Análise completa da marca"'
      }
    ];

    for (const column of columnsToAdd) {
      try {
        // Verificar se a coluna já existe
        const [existing] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'meli' 
          AND TABLE_NAME = 'brands' 
          AND COLUMN_NAME = ?
        `, [column.name]);

        if (existing.length === 0) {
          await connection.execute(`
            ALTER TABLE brands ADD COLUMN ${column.name} ${column.definition}
          `);
          console.log(`✅ Coluna "${column.name}" adicionada`);
        } else {
          console.log(`⏭️  Coluna "${column.name}" já existe`);
        }
      } catch (error) {
        console.error(`❌ Erro ao adicionar coluna "${column.name}":`, error.message);
      }
    }

    // Verificar estrutura final da tabela
    console.log('\n📋 Estrutura final da tabela brands:');
    const [columns] = await connection.execute('DESCRIBE brands');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 Tabela brands atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar tabela brands:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateBrandsTable();
}

module.exports = { updateBrandsTable };

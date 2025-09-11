const mysql = require('mysql2/promise');

async function addMarketplaceColumns() {
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

    console.log('🔧 Adicionando colunas do marketplace...');
    
    // Lista de colunas para adicionar
    const columns = [
      'tipo_roupa VARCHAR(100) DEFAULT NULL COMMENT "Tipo de Roupa"',
      'produto_vestuario VARCHAR(100) DEFAULT NULL COMMENT "Produto de Vestuário"',
      'tipo_manga VARCHAR(50) DEFAULT NULL COMMENT "Tipo de Manga"',
      'genero VARCHAR(50) DEFAULT NULL COMMENT "Gênero"',
      'cor VARCHAR(50) DEFAULT NULL COMMENT "Cor"',
      'seller_sku VARCHAR(100) DEFAULT NULL COMMENT "SKU (SELLER_SKU)"',
      'wedge_shape VARCHAR(50) DEFAULT NULL COMMENT "Forma de Caimento (WEDGE_SHAPE)"',
      'is_sportive ENUM("Sim", "Não") DEFAULT NULL COMMENT "É Esportiva (IS_SPORTIVE)"',
      'main_color VARCHAR(50) DEFAULT NULL COMMENT "Cor Principal (MAIN_COLOR)"',
      'item_condition VARCHAR(50) DEFAULT NULL COMMENT "Condição do Item (ITEM_CONDITION)"',
      'brand VARCHAR(100) DEFAULT NULL COMMENT "Marca (BRAND)"',
      'variacoes_nome TEXT DEFAULT NULL COMMENT "Variações do Nome"'
    ];

    // Verificar se a tabela marketplace existe
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'marketplace'
    `);

    if (tables.length === 0) {
      console.log('❌ Tabela marketplace não encontrada!');
      return;
    }

    console.log('✅ Tabela marketplace encontrada!');

    // Verificar colunas existentes
    const [existingColumns] = await connection.execute(`
      SHOW COLUMNS FROM marketplace
    `);

    const existingColumnNames = existingColumns.map(col => col.Field);
    console.log('📋 Colunas existentes:', existingColumnNames);

    // Adicionar cada coluna se ela não existir
    for (const column of columns) {
      const columnName = column.split(' ')[0];
      
      if (!existingColumnNames.includes(columnName)) {
        try {
          await connection.execute(`
            ALTER TABLE marketplace ADD COLUMN ${column}
          `);
          console.log(`✅ Coluna '${columnName}' adicionada com sucesso!`);
        } catch (error) {
          console.log(`⚠️ Erro ao adicionar coluna '${columnName}':`, error.message);
        }
      } else {
        console.log(`ℹ️ Coluna '${columnName}' já existe, pulando...`);
      }
    }

    // Verificar colunas finais
    const [finalColumns] = await connection.execute(`
      SHOW COLUMNS FROM marketplace
    `);

    console.log('\n📊 Estrutura final da tabela marketplace:');
    console.table(finalColumns.map(col => ({
      Field: col.Field,
      Type: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default,
      Extra: col.Extra
    })));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

addMarketplaceColumns();

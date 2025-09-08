const mysql = require('mysql2/promise');

async function addSEOFields() {
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

    // Adicionar novos campos para SEO e informações ricas
    const newColumns = [
      {
        name: 'seo_title',
        type: 'VARCHAR(255)',
        description: 'Título otimizado para SEO'
      },
      {
        name: 'seo_description',
        type: 'TEXT',
        description: 'Meta descrição otimizada para SEO'
      },
      {
        name: 'seo_keywords',
        type: 'TEXT',
        description: 'Palavras-chave para SEO'
      },
      {
        name: 'brand_story',
        type: 'TEXT',
        description: 'História completa da marca'
      },
      {
        name: 'brand_values',
        type: 'TEXT',
        description: 'Valores e princípios da marca'
      },
      {
        name: 'target_demographics',
        type: 'TEXT',
        description: 'Demografia detalhada do público-alvo'
      },
      {
        name: 'brand_personality',
        type: 'TEXT',
        description: 'Personalidade da marca'
      },
      {
        name: 'competitive_advantages',
        type: 'TEXT',
        description: 'Vantagens competitivas'
      },
      {
        name: 'product_categories',
        type: 'TEXT',
        description: 'Categorias de produtos principais'
      },
      {
        name: 'price_positioning',
        type: 'VARCHAR(100)',
        description: 'Posicionamento de preço'
      },
      {
        name: 'brand_voice_tone',
        type: 'TEXT',
        description: 'Tom de voz da marca'
      },
      {
        name: 'visual_identity',
        type: 'TEXT',
        description: 'Identidade visual detalhada'
      },
      {
        name: 'content_suggestions',
        type: 'TEXT',
        description: 'Sugestões de conteúdo para marketing'
      }
    ];

    console.log('🔧 Adicionando novos campos para SEO...');
    
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

    console.log('🎉 Campos SEO adicionados com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

addSEOFields();

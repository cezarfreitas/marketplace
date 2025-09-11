const mysql = require('mysql2/promise');

async function checkBrandsColumns() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔍 Verificando colunas da tabela brands_vtex...');
    
    const [columns] = await connection.execute('DESCRIBE brands_vtex');
    console.log('📋 Colunas da tabela brands_vtex:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verificar se as colunas necessárias existem
    const requiredColumns = [
      'title', 'meta_tag_description', 'image_url', 'brand_history', 
      'target_audience', 'language_type', 'consumption_behavior', 
      'visual_style', 'auxiliary_data_generated', 'brand_analysis'
    ];
    
    const existingColumns = columns.map(col => col.Field);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Colunas faltando:', missingColumns);
      
      console.log('📦 Adicionando colunas faltando...');
      for (const column of missingColumns) {
        let columnDefinition = '';
        switch (column) {
          case 'title':
            columnDefinition = 'ADD COLUMN title VARCHAR(255)';
            break;
          case 'meta_tag_description':
            columnDefinition = 'ADD COLUMN meta_tag_description TEXT';
            break;
          case 'image_url':
            columnDefinition = 'ADD COLUMN image_url TEXT';
            break;
          case 'brand_history':
            columnDefinition = 'ADD COLUMN brand_history TEXT';
            break;
          case 'target_audience':
            columnDefinition = 'ADD COLUMN target_audience TEXT';
            break;
          case 'language_type':
            columnDefinition = 'ADD COLUMN language_type VARCHAR(100)';
            break;
          case 'consumption_behavior':
            columnDefinition = 'ADD COLUMN consumption_behavior TEXT';
            break;
          case 'visual_style':
            columnDefinition = 'ADD COLUMN visual_style TEXT';
            break;
          case 'auxiliary_data_generated':
            columnDefinition = 'ADD COLUMN auxiliary_data_generated BOOLEAN DEFAULT FALSE';
            break;
          case 'brand_analysis':
            columnDefinition = 'ADD COLUMN brand_analysis TEXT';
            break;
        }
        
        if (columnDefinition) {
          await connection.execute(`ALTER TABLE brands_vtex ${columnDefinition}`);
          console.log(`✅ Coluna ${column} adicionada`);
        }
      }
    } else {
      console.log('✅ Todas as colunas necessárias existem!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkBrandsColumns();

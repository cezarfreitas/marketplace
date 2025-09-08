const mysql = require('mysql2/promise');

async function checkBrandsTable() {
  let connection;
  
  try {
    // Configuração do banco de dados (usando a mesma configuração do database.ts)
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado! Verificando estrutura da tabela brands...');
    const [rows] = await connection.execute('DESCRIBE brands');
    
    console.log('\n📋 Estrutura atual da tabela brands:');
    console.table(rows);
    
    // Campos esperados baseados no tipo Brand
    const expectedFields = [
      'id', 'vtex_id', 'name', 'is_active', 'title', 'meta_tag_description',
      'image_url', 'brand_history', 'target_audience', 'language_type',
      'consumption_behavior', 'visual_style', 'auxiliary_data_generated',
      'seo_title', 'seo_description', 'seo_keywords', 'brand_story',
      'brand_values', 'target_demographics', 'brand_personality',
      'competitive_advantages', 'product_categories', 'price_positioning',
      'brand_voice_tone', 'visual_identity', 'content_suggestions',
      'brand_analysis', 'contexto', 'created_at', 'updated_at'
    ];
    
    const existingFields = rows.map(row => row.Field);
    const missingFields = expectedFields.filter(field => !existingFields.includes(field));
    
    console.log('\n📊 Análise da estrutura:');
    console.log(`✅ Campos existentes: ${existingFields.length}`);
    console.log(`❌ Campos faltando: ${missingFields.length}`);
    
    if (missingFields.length > 0) {
      console.log('\n❌ Campos faltando:');
      missingFields.forEach(field => console.log(`  - ${field}`));
      
      console.log('\n🔧 Adicionando campos faltando...');
      
      // Adicionar campos faltando
      for (const field of missingFields) {
        try {
          let alterSQL = '';
          
          switch (field) {
            case 'seo_title':
              alterSQL = 'ALTER TABLE brands ADD COLUMN seo_title VARCHAR(255)';
              break;
            case 'seo_description':
              alterSQL = 'ALTER TABLE brands ADD COLUMN seo_description TEXT';
              break;
            case 'seo_keywords':
              alterSQL = 'ALTER TABLE brands ADD COLUMN seo_keywords TEXT';
              break;
            case 'brand_story':
              alterSQL = 'ALTER TABLE brands ADD COLUMN brand_story TEXT';
              break;
            case 'brand_values':
              alterSQL = 'ALTER TABLE brands ADD COLUMN brand_values TEXT';
              break;
            case 'target_demographics':
              alterSQL = 'ALTER TABLE brands ADD COLUMN target_demographics TEXT';
              break;
            case 'brand_personality':
              alterSQL = 'ALTER TABLE brands ADD COLUMN brand_personality TEXT';
              break;
            case 'competitive_advantages':
              alterSQL = 'ALTER TABLE brands ADD COLUMN competitive_advantages TEXT';
              break;
            case 'product_categories':
              alterSQL = 'ALTER TABLE brands ADD COLUMN product_categories TEXT';
              break;
            case 'price_positioning':
              alterSQL = 'ALTER TABLE brands ADD COLUMN price_positioning TEXT';
              break;
            case 'brand_voice_tone':
              alterSQL = 'ALTER TABLE brands ADD COLUMN brand_voice_tone TEXT';
              break;
            case 'visual_identity':
              alterSQL = 'ALTER TABLE brands ADD COLUMN visual_identity TEXT';
              break;
            case 'content_suggestions':
              alterSQL = 'ALTER TABLE brands ADD COLUMN content_suggestions TEXT';
              break;
            default:
              console.log(`⚠️ Campo ${field} não tem definição de ALTER TABLE`);
              continue;
          }
          
          if (alterSQL) {
            await connection.execute(alterSQL);
            console.log(`✅ Campo ${field} adicionado com sucesso!`);
          }
        } catch (error) {
          console.log(`❌ Erro ao adicionar campo ${field}:`, error.message);
        }
      }
      
      // Verificar estrutura final
      const [finalRows] = await connection.execute('DESCRIBE brands');
      console.log('\n📋 Estrutura final da tabela brands:');
      console.table(finalRows);
      
    } else {
      console.log('\n✅ Todos os campos esperados estão presentes!');
    }
    
    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    const [indexes] = await connection.execute('SHOW INDEX FROM brands');
    console.log('\n📋 Índices existentes:');
    console.table(indexes);
    
    // Verificar se todos os índices necessários existem
    const expectedIndexes = ['vtex_id', 'name', 'is_active'];
    const existingIndexColumns = [...new Set(indexes.map(idx => idx.Column_name))];
    const missingIndexes = expectedIndexes.filter(idx => !existingIndexColumns.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log('\n❌ Índices faltando:');
      missingIndexes.forEach(idx => console.log(`  - ${idx}`));
      
      console.log('\n🔧 Adicionando índices faltando...');
      for (const indexColumn of missingIndexes) {
        try {
          const indexSQL = `CREATE INDEX idx_brands_${indexColumn} ON brands(${indexColumn})`;
          await connection.execute(indexSQL);
          console.log(`✅ Índice idx_brands_${indexColumn} criado!`);
        } catch (error) {
          console.log(`❌ Erro ao criar índice ${indexColumn}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ Todos os índices necessários estão presentes!');
    }
    
    // Verificar dados na tabela
    console.log('\n📊 Verificando dados na tabela...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    console.log(`📈 Total de marcas: ${countResult[0].total}`);
    
    if (countResult[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT id, vtex_id, name, is_active, title FROM brands LIMIT 5');
      console.log('\n📋 Amostra de dados:');
      console.table(sampleData);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkBrandsTable();

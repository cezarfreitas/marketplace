const mysql = require('mysql2/promise');

async function checkProductsTable() {
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
    
    console.log('✅ Conectado! Verificando estrutura da tabela products...');
    const [rows] = await connection.execute('DESCRIBE products');
    
    console.log('\n📋 Estrutura atual da tabela products:');
    console.table(rows);
    
    // Campos esperados baseados no tipo Product
    const expectedFields = [
      'id', 'vtex_id', 'name', 'department_id', 'category_id', 'brand_id',
      'link_id', 'ref_id', 'is_visible', 'description', 'description_short',
      'release_date', 'keywords', 'title', 'is_active', 'tax_code',
      'meta_tag_description', 'supplier_id', 'show_without_stock',
      'adwords_remarketing_code', 'lomadee_campaign_code', 'score',
      'commercial_condition_id', 'reward_value', 'estimated_date_arrival',
      'measurement_unit', 'unit_multiplier', 'information_source',
      'modal_type', 'contexto', 'created_at', 'updated_at'
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
            case 'contexto':
              alterSQL = 'ALTER TABLE products ADD COLUMN contexto VARCHAR(100) DEFAULT "imported_from_vtex"';
              break;
            case 'score':
              alterSQL = 'ALTER TABLE products ADD COLUMN score INT DEFAULT 0';
              break;
            case 'commercial_condition_id':
              alterSQL = 'ALTER TABLE products ADD COLUMN commercial_condition_id INT';
              break;
            case 'reward_value':
              alterSQL = 'ALTER TABLE products ADD COLUMN reward_value DECIMAL(10,2) DEFAULT 0.00';
              break;
            case 'estimated_date_arrival':
              alterSQL = 'ALTER TABLE products ADD COLUMN estimated_date_arrival DATETIME';
              break;
            case 'measurement_unit':
              alterSQL = 'ALTER TABLE products ADD COLUMN measurement_unit VARCHAR(10) DEFAULT "un"';
              break;
            case 'unit_multiplier':
              alterSQL = 'ALTER TABLE products ADD COLUMN unit_multiplier INT DEFAULT 1';
              break;
            case 'information_source':
              alterSQL = 'ALTER TABLE products ADD COLUMN information_source VARCHAR(50) DEFAULT "vtex"';
              break;
            case 'modal_type':
              alterSQL = 'ALTER TABLE products ADD COLUMN modal_type VARCHAR(50) DEFAULT "default"';
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
      const [finalRows] = await connection.execute('DESCRIBE products');
      console.log('\n📋 Estrutura final da tabela products:');
      console.table(finalRows);
      
    } else {
      console.log('\n✅ Todos os campos esperados estão presentes!');
    }
    
    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    const [indexes] = await connection.execute('SHOW INDEX FROM products');
    console.log('\n📋 Índices existentes:');
    console.table(indexes);
    
    // Verificar se todos os índices necessários existem
    const expectedIndexes = ['vtex_id', 'name', 'category_id', 'brand_id', 'is_active', 'is_visible', 'ref_id'];
    const existingIndexColumns = [...new Set(indexes.map(idx => idx.Column_name))];
    const missingIndexes = expectedIndexes.filter(idx => !existingIndexColumns.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log('\n❌ Índices faltando:');
      missingIndexes.forEach(idx => console.log(`  - ${idx}`));
      
      console.log('\n🔧 Adicionando índices faltando...');
      for (const indexColumn of missingIndexes) {
        try {
          const indexSQL = `CREATE INDEX idx_products_${indexColumn} ON products(${indexColumn})`;
          await connection.execute(indexSQL);
          console.log(`✅ Índice idx_products_${indexColumn} criado!`);
        } catch (error) {
          console.log(`❌ Erro ao criar índice ${indexColumn}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ Todos os índices necessários estão presentes!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProductsTable();

const { executeQuery } = require('../src/lib/database.ts');

async function updateStockVtexTable() {
  try {
    console.log('🔄 Iniciando atualização da tabela stock_vtex...');
    
    // 1. Adicionar campo hasUnlimitedQuantity
    console.log('📝 Adicionando campo has_unlimited_quantity...');
    try {
      await executeQuery(`
        ALTER TABLE stock_vtex 
        ADD COLUMN has_unlimited_quantity TINYINT(1) DEFAULT 0 
        COMMENT 'Indica se o estoque é ilimitado'
      `);
      console.log('✅ Campo has_unlimited_quantity adicionado');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ Campo has_unlimited_quantity já existe');
      } else {
        throw error;
      }
    }
    
    // 2. Adicionar campo dateOfSupplyUtc
    console.log('📝 Adicionando campo date_of_supply_utc...');
    try {
      await executeQuery(`
        ALTER TABLE stock_vtex 
        ADD COLUMN date_of_supply_utc DATETIME NULL 
        COMMENT 'Data de fornecimento em UTC'
      `);
      console.log('✅ Campo date_of_supply_utc adicionado');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ Campo date_of_supply_utc já existe');
      } else {
        throw error;
      }
    }
    
    // 3. Adicionar campo leadTime
    console.log('📝 Adicionando campo lead_time...');
    try {
      await executeQuery(`
        ALTER TABLE stock_vtex 
        ADD COLUMN lead_time TIME NULL 
        COMMENT 'Tempo de lead para reabastecimento'
      `);
      console.log('✅ Campo lead_time adicionado');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ Campo lead_time já existe');
      } else {
        throw error;
      }
    }
    
    // 4. Adicionar campo vtex_sku_id
    console.log('📝 Adicionando campo vtex_sku_id...');
    try {
      await executeQuery(`
        ALTER TABLE stock_vtex 
        ADD COLUMN vtex_sku_id VARCHAR(50) NULL 
        COMMENT 'ID do SKU na VTEX'
      `);
      console.log('✅ Campo vtex_sku_id adicionado');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ Campo vtex_sku_id já existe');
      } else {
        throw error;
      }
    }
    
    // 5. Criar índice para vtex_sku_id
    console.log('📝 Criando índice para vtex_sku_id...');
    try {
      await executeQuery(`
        CREATE INDEX idx_stock_vtex_vtex_sku_id ON stock_vtex(vtex_sku_id)
      `);
      console.log('✅ Índice idx_stock_vtex_vtex_sku_id criado');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️ Índice idx_stock_vtex_vtex_sku_id já existe');
      } else {
        throw error;
      }
    }
    
    // 6. Verificar estrutura final
    console.log('🔍 Verificando estrutura final da tabela...');
    const columns = await executeQuery('DESCRIBE stock_vtex');
    
    console.log('\n📊 Estrutura final da tabela stock_vtex:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    console.log('\n✅ Atualização da tabela stock_vtex concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar tabela stock_vtex:', error);
  }
}

updateStockVtexTable();

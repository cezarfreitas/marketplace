const { executeQuery } = require('../src/lib/database.ts');

async function cleanupStockVtexTable() {
  try {
    console.log('🔄 Iniciando limpeza da tabela stock_vtex...');
    console.log('📋 Mantendo apenas campos do JSON da API VTEX:');
    console.log('   - warehouseId (warehouse_id)');
    console.log('   - warehouseName (warehouse_name)');
    console.log('   - totalQuantity (total_quantity)');
    console.log('   - reservedQuantity (reserved_quantity)');
    console.log('   - hasUnlimitedQuantity (has_unlimited_quantity)');
    console.log('   - timeToRefill (time_to_refill)');
    console.log('   - dateOfSupplyUtc (date_of_supply_utc)');
    console.log('   - leadTime (lead_time)');
    console.log('   + campos de controle: id, sku_id, vtex_sku_id, created_at, updated_at');
    
    // Verificar estrutura atual
    console.log('\n🔍 Estrutura atual da tabela:');
    const currentColumns = await executeQuery('DESCRIBE stock_vtex');
    currentColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    // Lista de colunas que devem ser mantidas
    const keepColumns = [
      'id',                    // Chave primária
      'sku_id',               // Referência ao SKU interno
      'vtex_sku_id',          // ID do SKU na VTEX
      'warehouse_id',         // warehouseId do JSON
      'warehouse_name',       // warehouseName do JSON
      'total_quantity',       // totalQuantity do JSON
      'reserved_quantity',    // reservedQuantity do JSON
      'has_unlimited_quantity', // hasUnlimitedQuantity do JSON
      'time_to_refill',       // timeToRefill do JSON
      'date_of_supply_utc',   // dateOfSupplyUtc do JSON
      'lead_time',            // leadTime do JSON
      'created_at',           // Controle
      'updated_at'            // Controle
    ];
    
    // Lista de colunas que devem ser removidas
    const columnsToRemove = currentColumns
      .map(col => col.Field)
      .filter(field => !keepColumns.includes(field));
    
    console.log('\n🗑️ Colunas que serão removidas:');
    columnsToRemove.forEach(col => {
      console.log(`- ${col}`);
    });
    
    if (columnsToRemove.length === 0) {
      console.log('✅ Nenhuma coluna precisa ser removida!');
      return;
    }
    
    // Remover colunas desnecessárias
    for (const column of columnsToRemove) {
      try {
        console.log(`\n🗑️ Removendo coluna: ${column}`);
        await executeQuery(`ALTER TABLE stock_vtex DROP COLUMN ${column}`);
        console.log(`✅ Coluna ${column} removida com sucesso`);
      } catch (error) {
        console.log(`❌ Erro ao remover coluna ${column}:`, error.message);
      }
    }
    
    // Verificar estrutura final
    console.log('\n🔍 Estrutura final da tabela:');
    const finalColumns = await executeQuery('DESCRIBE stock_vtex');
    
    console.log('\n📊 Estrutura final da tabela stock_vtex:');
    finalColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    console.log('\n✅ Limpeza da tabela stock_vtex concluída com sucesso!');
    console.log(`📊 Total de colunas: ${finalColumns.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar tabela stock_vtex:', error);
  }
}

cleanupStockVtexTable();

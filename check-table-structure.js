const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seo_db'
  });
  
  try {
    console.log('🔍 Verificando estrutura da tabela anymarket_sync_logs...');
    
    const [rows] = await connection.execute('DESCRIBE anymarket_sync_logs');
    console.log('📋 Estrutura atual:');
    console.table(rows);
    
    // Verificar se as colunas corretas existem
    const columns = rows.map(row => row.Field);
    console.log('📝 Colunas encontradas:', columns);
    
    const hasIdProdutoVtex = columns.includes('id_produto_vtex');
    const hasIdProdutoAny = columns.includes('id_produto_any');
    const hasProductId = columns.includes('product_id');
    const hasAnymarketId = columns.includes('anymarket_id');
    
    console.log('✅ id_produto_vtex existe:', hasIdProdutoVtex);
    console.log('✅ id_produto_any existe:', hasIdProdutoAny);
    console.log('⚠️ product_id existe (legacy):', hasProductId);
    console.log('⚠️ anymarket_id existe (legacy):', hasAnymarketId);
    
    if (hasIdProdutoVtex && hasIdProdutoAny) {
      console.log('🎉 Tabela está com a estrutura correta!');
    } else {
      console.log('❌ Tabela precisa ser corrigida');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkTableStructure();

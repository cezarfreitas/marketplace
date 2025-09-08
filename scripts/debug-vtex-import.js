const mysql = require('mysql2/promise');

async function debugVTEXImport() {
  let connection;
  
  try {
    // Configuração do banco de dados
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
    
    // Lista de RefIds que estão falhando
    const failingRefIds = [
      'ECKCAMM15U021',
      'ECKCAMM15U031', 
      'ECKCAMM1480G1',
      'ECKCAMM15T031',
      'ECKCAMM14V0B1',
      'ECKCAMM1010L1',
      'ECKCAMM12H0J1'
    ];
    
    console.log('🔍 Verificando produtos com vtex_id NULL...');
    
    // Verificar se existem produtos com vtex_id NULL
    const [nullVtexIdProducts] = await connection.execute(
      'SELECT id, name, ref_id, vtex_id FROM products WHERE vtex_id IS NULL'
    );
    
    if (nullVtexIdProducts.length > 0) {
      console.log('\n❌ Produtos com vtex_id NULL encontrados:');
      console.table(nullVtexIdProducts);
    } else {
      console.log('\n✅ Nenhum produto com vtex_id NULL encontrado');
    }
    
    // Verificar produtos com RefIds problemáticos
    console.log('\n🔍 Verificando produtos com RefIds problemáticos...');
    
    for (const refId of failingRefIds) {
      const [products] = await connection.execute(
        'SELECT id, name, ref_id, vtex_id, created_at FROM products WHERE ref_id = ?',
        [refId]
      );
      
      if (products.length > 0) {
        console.log(`\n📦 Produto encontrado para RefId ${refId}:`);
        console.table(products);
      } else {
        console.log(`\n❌ Nenhum produto encontrado para RefId ${refId}`);
      }
    }
    
    // Verificar estrutura da tabela products
    console.log('\n🔍 Verificando estrutura da tabela products...');
    const [structure] = await connection.execute('DESCRIBE products');
    
    const vtexIdColumn = structure.find(col => col.Field === 'vtex_id');
    if (vtexIdColumn) {
      console.log('\n📋 Coluna vtex_id:');
      console.table([vtexIdColumn]);
      
      if (vtexIdColumn.Null === 'NO') {
        console.log('⚠️ PROBLEMA: A coluna vtex_id está definida como NOT NULL, mas alguns produtos estão sendo inseridos com valor NULL');
        console.log('💡 SOLUÇÃO: Adicionar validação antes da inserção ou alterar a coluna para permitir NULL temporariamente');
      }
    }
    
    // Verificar logs de erro recentes (se existir uma tabela de logs)
    console.log('\n🔍 Verificando se existem logs de erro...');
    const [tables] = await connection.execute("SHOW TABLES LIKE '%log%'");
    
    if (tables.length > 0) {
      console.log('📋 Tabelas de log encontradas:');
      console.table(tables);
    } else {
      console.log('ℹ️ Nenhuma tabela de log encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugVTEXImport();

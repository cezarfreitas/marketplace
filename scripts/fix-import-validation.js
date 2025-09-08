const mysql = require('mysql2/promise');

async function fixImportValidation() {
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
    
    // 1. Verificar produtos com vtex_id NULL
    console.log('\n🔍 Verificando produtos com vtex_id NULL...');
    const [nullProducts] = await connection.execute(
      'SELECT id, name, ref_id, vtex_id, created_at FROM products WHERE vtex_id IS NULL'
    );
    
    if (nullProducts.length > 0) {
      console.log(`❌ Encontrados ${nullProducts.length} produtos com vtex_id NULL:`);
      console.table(nullProducts);
      
      // Opção 1: Deletar produtos com vtex_id NULL (não recomendado se há dados importantes)
      // Opção 2: Tentar buscar o vtex_id correto da VTEX
      // Opção 3: Marcar como inválidos
      
      console.log('\n🔧 Opções para corrigir:');
      console.log('1. Deletar produtos com vtex_id NULL');
      console.log('2. Tentar buscar vtex_id correto da VTEX');
      console.log('3. Marcar como inválidos (adicionar campo is_valid)');
      
      // Por enquanto, vamos marcar como inválidos
      console.log('\n🔧 Marcando produtos com vtex_id NULL como inválidos...');
      
      // Adicionar coluna is_valid se não existir
      try {
        await connection.execute('ALTER TABLE products ADD COLUMN is_valid BOOLEAN DEFAULT TRUE');
        console.log('✅ Coluna is_valid adicionada');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('ℹ️ Coluna is_valid já existe');
        } else {
          throw error;
        }
      }
      
      // Marcar produtos com vtex_id NULL como inválidos
      await connection.execute(
        'UPDATE products SET is_valid = FALSE WHERE vtex_id IS NULL'
      );
      console.log(`✅ ${nullProducts.length} produtos marcados como inválidos`);
      
    } else {
      console.log('✅ Nenhum produto com vtex_id NULL encontrado');
    }
    
    // 2. Verificar estrutura da tabela
    console.log('\n🔍 Verificando estrutura da tabela products...');
    const [structure] = await connection.execute('DESCRIBE products');
    
    const vtexIdColumn = structure.find(col => col.Field === 'vtex_id');
    if (vtexIdColumn && vtexIdColumn.Null === 'NO') {
      console.log('⚠️ A coluna vtex_id está definida como NOT NULL');
      console.log('💡 Recomendação: Manter NOT NULL e adicionar validação no código de importação');
    }
    
    // 3. Verificar produtos duplicados por ref_id
    console.log('\n🔍 Verificando produtos duplicados por ref_id...');
    const [duplicates] = await connection.execute(`
      SELECT ref_id, COUNT(*) as count 
      FROM products 
      WHERE ref_id IS NOT NULL 
      GROUP BY ref_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log(`❌ Encontrados ${duplicates.length} ref_ids duplicados:`);
      console.table(duplicates);
    } else {
      console.log('✅ Nenhum ref_id duplicado encontrado');
    }
    
    // 4. Verificar produtos duplicados por vtex_id
    console.log('\n🔍 Verificando produtos duplicados por vtex_id...');
    const [duplicateVtexIds] = await connection.execute(`
      SELECT vtex_id, COUNT(*) as count 
      FROM products 
      WHERE vtex_id IS NOT NULL 
      GROUP BY vtex_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateVtexIds.length > 0) {
      console.log(`❌ Encontrados ${duplicateVtexIds.length} vtex_ids duplicados:`);
      console.table(duplicateVtexIds);
    } else {
      console.log('✅ Nenhum vtex_id duplicado encontrado');
    }
    
    // 5. Estatísticas gerais
    console.log('\n📊 Estatísticas da tabela products:');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN vtex_id IS NOT NULL THEN 1 END) as with_vtex_id,
        COUNT(CASE WHEN vtex_id IS NULL THEN 1 END) as without_vtex_id
      FROM products
    `);
    
    console.table(stats);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixImportValidation();

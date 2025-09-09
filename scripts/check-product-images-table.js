const mysql = require('mysql2/promise');

async function checkProductImagesTable() {
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
    
    // 1. Verificar se a tabela product_images existe
    console.log('\n📋 1. Verificando se a tabela product_images existe...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'meli' 
        AND TABLE_NAME = 'product_images'
      `);
      
      if (tables.length > 0) {
        console.log('✅ Tabela product_images existe');
        
        // 2. Verificar estrutura da tabela
        console.log('\n📋 2. Estrutura da tabela product_images:');
        const [structure] = await connection.execute('DESCRIBE product_images');
        console.table(structure);
        
        // 3. Contar registros
        console.log('\n📊 3. Contando registros na tabela...');
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM product_images');
        const totalRecords = countResult[0].total;
        console.log(`📊 Total de registros: ${totalRecords}`);
        
        if (totalRecords > 0) {
          // 4. Mostrar alguns registros de exemplo
          console.log('\n📋 4. Exemplos de registros:');
          const [samples] = await connection.execute(`
            SELECT * FROM product_images 
            ORDER BY id DESC 
            LIMIT 5
          `);
          console.table(samples);
          
          // 5. Verificar relacionamentos
          console.log('\n🔗 5. Verificando relacionamentos com produtos:');
          const [relationships] = await connection.execute(`
            SELECT 
              p.ref_id,
              p.name as product_name,
              COUNT(pi.id) as image_count
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            GROUP BY p.id, p.ref_id, p.name
            HAVING image_count > 0
            ORDER BY image_count DESC
            LIMIT 10
          `);
          
          if (relationships.length > 0) {
            console.log('📊 Produtos com imagens na tabela product_images:');
            console.table(relationships);
          } else {
            console.log('❌ Nenhum produto com imagens encontrado');
          }
        }
        
      } else {
        console.log('❌ Tabela product_images não existe');
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar tabela product_images:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProductImagesTable();

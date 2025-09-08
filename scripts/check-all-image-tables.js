// Verificar todas as tabelas relacionadas a imagens
const mysql = require('mysql2/promise');

async function checkAllImageTables() {
  console.log('🔍 Verificando todas as tabelas relacionadas a imagens...');
  
  const dbConfig = {
    host: 'server.idenegociosdigitais.com.br',
    port: 3349,
    user: 'meli',
    password: '7dd3e59ddb3c3a5da0e3',
    database: 'meli',
    charset: 'utf8mb4'
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Listar todas as tabelas
    console.log('\n📋 Todas as tabelas no banco:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    // Verificar tabelas que podem conter imagens
    const possibleImageTables = ['product_images', 'images', 'product_media', 'media', 'files'];
    
    for (const tableName of possibleImageTables) {
      try {
        console.log(`\n🔍 Verificando tabela: ${tableName}`);
        
        // Verificar se a tabela existe
        const [tableExists] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'meli' AND table_name = ?
        `, [tableName]);
        
        if (tableExists[0].count > 0) {
          console.log(`✅ Tabela ${tableName} existe`);
          
          // Verificar estrutura
          const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
          console.log(`📋 Estrutura da tabela ${tableName}:`);
          console.table(structure);
          
          // Contar registros
          const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
          const total = countResult[0].total;
          console.log(`📊 Total de registros em ${tableName}: ${total}`);
          
          if (total > 0) {
            // Mostrar alguns registros
            const [records] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 5`);
            console.log(`📋 Primeiros registros de ${tableName}:`);
            console.table(records);
          }
        } else {
          console.log(`❌ Tabela ${tableName} não existe`);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar tabela ${tableName}: ${error.message}`);
      }
    }
    
    // Verificar se há colunas de imagem em outras tabelas
    console.log('\n🔍 Verificando colunas de imagem em outras tabelas:');
    const [imageColumns] = await connection.execute(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'meli' 
      AND (column_name LIKE '%image%' OR column_name LIKE '%url%' OR column_name LIKE '%file%')
      ORDER BY table_name, column_name
    `);
    
    if (imageColumns.length > 0) {
      console.log('📋 Colunas relacionadas a imagens:');
      console.table(imageColumns);
    } else {
      console.log('❌ Nenhuma coluna de imagem encontrada');
    }
    
    // Verificar produtos e suas imagens
    console.log('\n🔍 Verificando produtos e suas imagens:');
    const [productsWithImages] = await connection.execute(`
      SELECT 
        p.id,
        p.ref_id,
        p.name,
        p.vtex_id,
        COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.ref_id, p.name, p.vtex_id
      ORDER BY image_count DESC
      LIMIT 10
    `);
    
    console.log('📊 Produtos e contagem de imagens:');
    console.table(productsWithImages);
    
    await connection.end();
    console.log('\n✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkAllImageTables();

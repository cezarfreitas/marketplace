const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkTables() {
  let connection;
  
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST,
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('🔍 Verificando tabelas titles e descriptions...');
    
    // Verificar se tabela titles existe
    const [titlesExists] = await connection.execute('SHOW TABLES LIKE "titles"');
    console.log('📋 Tabela titles existe:', titlesExists.length > 0);
    
    // Verificar se tabela descriptions existe
    const [descriptionsExists] = await connection.execute('SHOW TABLES LIKE "descriptions"');
    console.log('📋 Tabela descriptions existe:', descriptionsExists.length > 0);
    
    if (titlesExists.length > 0) {
      const [titlesCount] = await connection.execute('SELECT COUNT(*) as count FROM titles');
      console.log('📊 Registros na tabela titles:', titlesCount[0].count);
      
      // Mostrar alguns exemplos
      const [titlesSample] = await connection.execute('SELECT id, product_id, title FROM titles ORDER BY created_at DESC LIMIT 3');
      console.log('📝 Exemplos de titles:');
      titlesSample.forEach((title, index) => {
        console.log(`   ${index + 1}. ID ${title.id} - Produto ${title.product_id}: ${title.title.substring(0, 50)}...`);
      });
    }
    
    if (descriptionsExists.length > 0) {
      const [descriptionsCount] = await connection.execute('SELECT COUNT(*) as count FROM descriptions');
      console.log('📊 Registros na tabela descriptions:', descriptionsCount[0].count);
      
      // Mostrar alguns exemplos
      const [descriptionsSample] = await connection.execute('SELECT id, product_id, title, description FROM descriptions ORDER BY created_at DESC LIMIT 3');
      console.log('📝 Exemplos de descriptions:');
      descriptionsSample.forEach((desc, index) => {
        console.log(`   ${index + 1}. ID ${desc.id} - Produto ${desc.product_id}: ${desc.title.substring(0, 50)}...`);
        console.log(`      Descrição: ${desc.description.substring(0, 100)}...`);
      });
    }
    
    // Verificar se há produtos sem título ou descrição
    if (titlesExists.length > 0 && descriptionsExists.length > 0) {
      const [missingData] = await connection.execute(`
        SELECT p.id, p.ref_id, p.name 
        FROM products_vtex p 
        LEFT JOIN titles t ON p.id = t.product_id 
        LEFT JOIN descriptions d ON p.id = d.product_id 
        WHERE t.id IS NULL OR d.id IS NULL 
        LIMIT 5
      `);
      
      if (missingData.length > 0) {
        console.log('⚠️ Produtos sem título ou descrição:');
        missingData.forEach((prod, index) => {
          console.log(`   ${index + 1}. ID ${prod.id} - ${prod.ref_id}: ${prod.name.substring(0, 50)}...`);
        });
      } else {
        console.log('✅ Todos os produtos têm título e descrição!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

checkTables();

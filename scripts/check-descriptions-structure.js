const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkDescriptionsStructure() {
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

    console.log('🔍 Verificando estrutura da tabela descriptions...');
    
    // Verificar estrutura da tabela descriptions
    const [descriptionsStructure] = await connection.execute('DESCRIBE descriptions');
    console.log('📋 Estrutura da tabela descriptions:');
    descriptionsStructure.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.Field} - ${column.Type} - ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar se há registros
    const [descriptionsCount] = await connection.execute('SELECT COUNT(*) as count FROM descriptions');
    console.log(`📊 Total de registros: ${descriptionsCount[0].count}`);
    
    if (descriptionsCount[0].count > 0) {
      // Mostrar alguns registros
      const [descriptionsSample] = await connection.execute('SELECT * FROM descriptions LIMIT 2');
      console.log('📝 Exemplos de registros:');
      descriptionsSample.forEach((desc, index) => {
        console.log(`   ${index + 1}. ID ${desc.id} - Produto ${desc.product_id}`);
        Object.keys(desc).forEach(key => {
          if (desc[key] !== null && typeof desc[key] === 'string' && desc[key].length > 0) {
            console.log(`      ${key}: ${desc[key].substring(0, 100)}...`);
          }
        });
      });
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

checkDescriptionsStructure();
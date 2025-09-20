// Script para criar a tabela descriptions
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDescriptionsTable() {
  console.log('🔧 Configurando tabela descriptions...\n');

  try {
    // Ler o arquivo SQL
    const sql = fs.readFileSync('scripts/create-descriptions-table.sql', 'utf8');
    console.log('📄 SQL carregado do arquivo');

    // Conectar ao banco
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli'
    });

    console.log('🔗 Conectado ao banco de dados');

    // Executar o SQL
    await connection.execute(sql);
    console.log('✅ Tabela descriptions criada com sucesso!');

    // Verificar se a tabela foi criada
    const [tables] = await connection.execute("SHOW TABLES LIKE 'descriptions'");
    if (tables.length > 0) {
      console.log('✅ Tabela descriptions confirmada no banco');
      
      // Mostrar estrutura da tabela
      const [structure] = await connection.execute("DESCRIBE descriptions");
      console.log('\n📋 Estrutura da tabela:');
      structure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ Tabela descriptions não encontrada');
    }

    await connection.end();
    console.log('\n🎉 Setup concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

setupDescriptionsTable();

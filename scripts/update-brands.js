const mysql = require('mysql2/promise');
const fs = require('fs');

async function updateBrandsTable() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados');

    // Ler o script SQL
    const sql = fs.readFileSync('scripts/update-brands-table.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    console.log(`📝 Executando ${statements.length} statements SQL...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executado com sucesso`);
        } catch (error) {
          console.error(`❌ Erro no statement ${i + 1}:`, error.message);
        }
      }
    }

    console.log('🎉 Tabela de marcas atualizada com sucesso!');
    console.log('');
    console.log('📊 Nova estrutura da tabela brands:');
    console.log('  - id (INT, AUTO_INCREMENT, PRIMARY KEY)');
    console.log('  - vtex_id (INT, UNIQUE) - ID da marca na VTEX');
    console.log('  - name (VARCHAR) - Nome da marca');
    console.log('  - is_active (BOOLEAN) - Status ativo/inativo');
    console.log('  - title (VARCHAR) - Título da marca');
    console.log('  - meta_tag_description (TEXT) - Descrição para meta tags');
    console.log('  - image_url (TEXT) - URL da imagem');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

updateBrandsTable();

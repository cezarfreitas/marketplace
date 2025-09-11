const mysql = require('mysql2/promise');

async function checkImportedCategories() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔍 Verificando categorias importadas...');
    
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM categories_vtex');
    console.log('📊 Total de categorias importadas:', rows[0].total);
    
    const [samples] = await connection.execute('SELECT vtex_id, name, is_active, has_children FROM categories_vtex LIMIT 10');
    console.log('📋 Primeiras 10 categorias:');
    samples.forEach((cat, index) => {
      console.log(`  ${index + 1}. ID: ${cat.vtex_id}, Nome: ${cat.name}, Ativa: ${cat.is_active}, Tem filhos: ${cat.has_children}`);
    });
    
    // Verificar categorias com filhos
    const [withChildren] = await connection.execute('SELECT COUNT(*) as total FROM categories_vtex WHERE has_children = true');
    console.log('🌳 Categorias com subcategorias:', withChildren[0].total);
    
    // Verificar categorias ativas
    const [active] = await connection.execute('SELECT COUNT(*) as total FROM categories_vtex WHERE is_active = true');
    console.log('✅ Categorias ativas:', active[0].total);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkImportedCategories();
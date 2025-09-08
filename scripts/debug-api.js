const mysql = require('mysql2/promise');

async function debugAPI() {
  let connection;
  
  try {
    console.log('🔄 Testando conexão e debug da API...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco!');

    // Simular a query da API
    console.log('🔍 Testando query da API...');
    const page = 1;
    const limit = 10;
    const search = '';
    const offset = (page - 1) * limit;

    console.log(`Parâmetros: page=${page}, limit=${limit}, search="${search}", offset=${offset}`);

    // Buscar total de registros
    let total = 0;
    if (search) {
      const countResult = await connection.execute(
        'SELECT COUNT(*) as total FROM brands WHERE name LIKE ?',
        [`%${search}%`]
      );
      total = countResult[0][0].total;
    } else {
      const countResult = await connection.execute('SELECT COUNT(*) as total FROM brands');
      total = countResult[0][0].total;
    }

    console.log(`📊 Total de registros: ${total}`);

    // Buscar marcas com paginação
    let brands;
    if (search) {
      brands = await connection.execute(
        'SELECT id, vtex_id, name, is_active, title, meta_tag_description, image_url, created_at FROM brands WHERE name LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?',
        [`%${search}%`, parseInt(limit), parseInt(offset)]
      );
    } else {
      brands = await connection.execute(
        `SELECT id, vtex_id, name, is_active, title, meta_tag_description, image_url, created_at FROM brands ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`
      );
    }

    console.log(`✅ Query executada com sucesso!`);
    console.log(`📋 Retornando ${brands[0].length} marcas:`);
    
    brands[0].forEach(brand => {
      console.log(`  - ID: ${brand.id}, Nome: ${brand.name}, VTEX ID: ${brand.vtex_id}, Ativo: ${brand.is_active}`);
    });

    // Simular resposta da API
    const response = {
      success: true,
      brands: brands[0],
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    };

    console.log('📤 Resposta da API:');
    console.log(JSON.stringify(response, null, 2));

    console.log('🎉 Debug concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

debugAPI();

const mysql = require('mysql2/promise');

async function verifyProductsStructure() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar estrutura atual da tabela products_vtex
    console.log('🔍 Verificando estrutura da tabela products_vtex...');
    const [structure] = await connection.execute('DESCRIBE products_vtex');
    console.log('📊 Estrutura atual:');
    console.table(structure);

    // Verificar se todos os campos mencionados existem
    const expectedFields = [
      'id', 'name', 'department_id', 'category_id', 'brand_id', 'link_id', 
      'ref_id', 'is_visible', 'description', 'description_short', 'release_date', 
      'keywords', 'title', 'is_active', 'tax_code', 'meta_tag_description', 
      'supplier_id', 'show_without_stock', 'list_store_id', 'adwords_remarketing_code', 
      'lomadee_campaign_code', 'created_at', 'updated_at'
    ];

    const existingFields = structure.map(field => field.Field);
    console.log('\n🔍 Verificando campos esperados...');
    
    const missingFields = expectedFields.filter(field => !existingFields.includes(field));
    const extraFields = existingFields.filter(field => !expectedFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log('❌ Campos faltando:');
      missingFields.forEach(field => console.log(`   - ${field}`));
    } else {
      console.log('✅ Todos os campos esperados estão presentes');
    }
    
    if (extraFields.length > 0) {
      console.log('⚠️ Campos extras encontrados:');
      extraFields.forEach(field => console.log(`   - ${field}`));
    }

    // Verificar dados de exemplo
    console.log('\n🔍 Verificando dados de exemplo...');
    const [sampleData] = await connection.execute('SELECT * FROM products_vtex LIMIT 1');
    if (sampleData.length > 0) {
      console.log('📋 Dados de exemplo:');
      const product = sampleData[0];
      expectedFields.forEach(field => {
        const value = product[field];
        console.log(`   ${field}: ${value !== null ? value : 'NULL'} (${typeof value})`);
      });
    }

    // Verificar relacionamentos com outras tabelas
    console.log('\n🔍 Verificando relacionamentos...');
    
    // Verificar se brand_id existe na tabela brands
    try {
      const [brandCheck] = await connection.execute(`
        SELECT p.id, p.name, p.brand_id, b.name as brand_name
        FROM products_vtex p
        LEFT JOIN brands b ON p.brand_id = b.vtex_id
        LIMIT 3
      `);
      
      console.log('📊 Relacionamento com brands:');
      brandCheck.forEach(p => {
        console.log(`   Produto ${p.id} (${p.name}) - Brand ID: ${p.brand_id} - Brand Name: ${p.brand_name || 'NÃO ENCONTRADA'}`);
      });
    } catch (error) {
      console.log(`❌ Erro ao verificar relacionamento com brands: ${error.message}`);
    }

    // Verificar se category_id existe na tabela categories
    try {
      const [categoryCheck] = await connection.execute(`
        SELECT p.id, p.name, p.category_id, c.name as category_name
        FROM products_vtex p
        LEFT JOIN categories c ON p.category_id = c.vtex_id
        LIMIT 3
      `);
      
      console.log('📊 Relacionamento com categories:');
      categoryCheck.forEach(p => {
        console.log(`   Produto ${p.id} (${p.name}) - Category ID: ${p.category_id} - Category Name: ${p.category_name || 'NÃO ENCONTRADA'}`);
      });
    } catch (error) {
      console.log(`❌ Erro ao verificar relacionamento com categories: ${error.message}`);
    }

    // Verificar se há problemas com campos obrigatórios
    console.log('\n🔍 Verificando campos obrigatórios...');
    const [nullChecks] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(name) as has_name,
        COUNT(ref_id) as has_ref_id,
        COUNT(brand_id) as has_brand_id,
        COUNT(category_id) as has_category_id
      FROM products_vtex
    `);
    
    const checks = nullChecks[0];
    console.log('📊 Verificação de campos obrigatórios:');
    console.log(`   Total de produtos: ${checks.total}`);
    console.log(`   Com nome: ${checks.has_name}`);
    console.log(`   Com ref_id: ${checks.has_ref_id}`);
    console.log(`   Com brand_id: ${checks.has_brand_id}`);
    console.log(`   Com category_id: ${checks.has_category_id}`);
    
    if (checks.total !== checks.has_name) {
      console.log('⚠️ Alguns produtos não têm nome');
    }
    if (checks.total !== checks.has_ref_id) {
      console.log('⚠️ Alguns produtos não têm ref_id');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

verifyProductsStructure();

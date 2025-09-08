const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  charset: 'utf8mb4',
};

// Dados mockup de produtos
const mockupProducts = [
  {
    vtex_id: 1001,
    name: 'Camiseta Básica Masculina',
    description: 'Camiseta básica de algodão 100% para uso diário',
    department_id: 1,
    brand_id: 1,
    category_id: 1,
    is_active: true,
    is_visible: true,
    link_id: 'camiseta-basica-masculina',
    meta_tag_description: 'Camiseta básica masculina de qualidade',
    title: 'Camiseta Básica Masculina - Algodão 100%',
    context: JSON.stringify({
      material: 'Algodão 100%',
      cor: 'Branco',
      tamanho: 'P, M, G, GG'
    })
  },
  {
    vtex_id: 1002,
    name: 'Calça Jeans Feminina',
    description: 'Calça jeans feminina com corte moderno e confortável',
    department_id: 2,
    brand_id: 2,
    category_id: 2,
    is_active: true,
    is_visible: true,
    link_id: 'calca-jeans-feminina',
    meta_tag_description: 'Calça jeans feminina moderna e confortável',
    title: 'Calça Jeans Feminina - Corte Moderno',
    context: JSON.stringify({
      material: 'Denim',
      cor: 'Azul',
      tamanho: '36, 38, 40, 42, 44'
    })
  },
  {
    vtex_id: 1003,
    name: 'Tênis Esportivo Unissex',
    description: 'Tênis esportivo para corrida e caminhada',
    department_id: 3,
    brand_id: 3,
    category_id: 3,
    is_active: true,
    is_visible: true,
    link_id: 'tenis-esportivo-unissex',
    meta_tag_description: 'Tênis esportivo confortável para atividades físicas',
    title: 'Tênis Esportivo Unissex - Corrida e Caminhada',
    context: JSON.stringify({
      material: 'Mesh e Borracha',
      cor: 'Preto e Branco',
      tamanho: '35, 36, 37, 38, 39, 40, 41, 42, 43, 44'
    })
  },
  {
    vtex_id: 1004,
    name: 'Bolsa Feminina de Couro',
    description: 'Bolsa feminina de couro legítimo com acabamento premium',
    department_id: 4,
    brand_id: 4,
    category_id: 4,
    is_active: true,
    is_visible: true,
    link_id: 'bolsa-feminina-couro',
    meta_tag_description: 'Bolsa feminina de couro legítimo premium',
    title: 'Bolsa Feminina de Couro - Premium',
    context: JSON.stringify({
      material: 'Couro Legítimo',
      cor: 'Marrom',
      dimensoes: '30x20x10cm'
    })
  },
  {
    vtex_id: 1005,
    name: 'Relógio Masculino Digital',
    description: 'Relógio digital masculino com múltiplas funções',
    department_id: 5,
    brand_id: 5,
    category_id: 5,
    is_active: true,
    is_visible: true,
    link_id: 'relogio-masculino-digital',
    meta_tag_description: 'Relógio digital masculino com funções avançadas',
    title: 'Relógio Masculino Digital - Multifuncional',
    context: JSON.stringify({
      material: 'Plástico e Metal',
      cor: 'Preto',
      funcoes: 'Cronômetro, Alarme, Luz LED'
    })
  }
];

// Dados mockup de SKUs
const mockupSkus = [
  // SKUs para Camiseta Básica Masculina (vtex_id: 1001)
  { vtex_id: 2001, product_id: 1, name: 'Camiseta Básica Masculina - P', ref_id: 'CAM-BAS-M-P', is_active: true, context: JSON.stringify({ tamanho: 'P', cor: 'Branco' }) },
  { vtex_id: 2002, product_id: 1, name: 'Camiseta Básica Masculina - M', ref_id: 'CAM-BAS-M-M', is_active: true, context: JSON.stringify({ tamanho: 'M', cor: 'Branco' }) },
  { vtex_id: 2003, product_id: 1, name: 'Camiseta Básica Masculina - G', ref_id: 'CAM-BAS-M-G', is_active: true, context: JSON.stringify({ tamanho: 'G', cor: 'Branco' }) },
  
  // SKUs para Calça Jeans Feminina (vtex_id: 1002)
  { vtex_id: 2004, product_id: 2, name: 'Calça Jeans Feminina - 36', ref_id: 'CAL-JEANS-F-36', is_active: true, context: JSON.stringify({ tamanho: '36', cor: 'Azul' }) },
  { vtex_id: 2005, product_id: 2, name: 'Calça Jeans Feminina - 38', ref_id: 'CAL-JEANS-F-38', is_active: true, context: JSON.stringify({ tamanho: '38', cor: 'Azul' }) },
  
  // SKUs para Tênis Esportivo (vtex_id: 1003)
  { vtex_id: 2006, product_id: 3, name: 'Tênis Esportivo - 40', ref_id: 'TEN-ESP-40', is_active: true, context: JSON.stringify({ tamanho: '40', cor: 'Preto e Branco' }) },
  { vtex_id: 2007, product_id: 3, name: 'Tênis Esportivo - 42', ref_id: 'TEN-ESP-42', is_active: true, context: JSON.stringify({ tamanho: '42', cor: 'Preto e Branco' }) },
  
  // SKUs para Bolsa Feminina (vtex_id: 1004)
  { vtex_id: 2008, product_id: 4, name: 'Bolsa Feminina de Couro', ref_id: 'BOL-COURO-F', is_active: true, context: JSON.stringify({ cor: 'Marrom' }) },
  
  // SKUs para Relógio Masculino (vtex_id: 1005)
  { vtex_id: 2009, product_id: 5, name: 'Relógio Masculino Digital', ref_id: 'REL-DIG-M', is_active: true, context: JSON.stringify({ cor: 'Preto' }) }
];

// Dados mockup de imagens
const mockupImages = [
  // Imagens para Camiseta Básica Masculina
  { vtex_id: 3001, archive_id: 8001, sku_id: 1, name: 'Camiseta Básica Masculina - P', is_main: true, text: 'Camiseta Básica Masculina - P', file_location: 'vteximg.com.br/arquivos/ids/8001/camiseta-basica-masculina-p.jpg', position: 0 },
  { vtex_id: 3002, archive_id: 8002, sku_id: 2, name: 'Camiseta Básica Masculina - M', is_main: true, text: 'Camiseta Básica Masculina - M', file_location: 'vteximg.com.br/arquivos/ids/8002/camiseta-basica-masculina-m.jpg', position: 0 },
  { vtex_id: 3003, archive_id: 8003, sku_id: 3, name: 'Camiseta Básica Masculina - G', is_main: true, text: 'Camiseta Básica Masculina - G', file_location: 'vteximg.com.br/arquivos/ids/8003/camiseta-basica-masculina-g.jpg', position: 0 },
  
  // Imagens para Calça Jeans Feminina
  { vtex_id: 3004, archive_id: 8004, sku_id: 4, name: 'Calça Jeans Feminina - 36', is_main: true, text: 'Calça Jeans Feminina - 36', file_location: 'vteximg.com.br/arquivos/ids/8004/calca-jeans-feminina-36.jpg', position: 0 },
  { vtex_id: 3005, archive_id: 8005, sku_id: 5, name: 'Calça Jeans Feminina - 38', is_main: true, text: 'Calça Jeans Feminina - 38', file_location: 'vteximg.com.br/arquivos/ids/8005/calca-jeans-feminina-38.jpg', position: 0 },
  
  // Imagens para Tênis Esportivo
  { vtex_id: 3006, archive_id: 8006, sku_id: 6, name: 'Tênis Esportivo - 40', is_main: true, text: 'Tênis Esportivo - 40', file_location: 'vteximg.com.br/arquivos/ids/8006/tenis-esportivo-40.jpg', position: 0 },
  { vtex_id: 3007, archive_id: 8007, sku_id: 7, name: 'Tênis Esportivo - 42', is_main: true, text: 'Tênis Esportivo - 42', file_location: 'vteximg.com.br/arquivos/ids/8007/tenis-esportivo-42.jpg', position: 0 },
  
  // Imagens para Bolsa Feminina
  { vtex_id: 3008, archive_id: 8008, sku_id: 8, name: 'Bolsa Feminina de Couro', is_main: true, text: 'Bolsa Feminina de Couro', file_location: 'vteximg.com.br/arquivos/ids/8008/bolsa-feminina-couro.jpg', position: 0 },
  
  // Imagens para Relógio Masculino
  { vtex_id: 3009, archive_id: 8009, sku_id: 9, name: 'Relógio Masculino Digital', is_main: true, text: 'Relógio Masculino Digital', file_location: 'vteximg.com.br/arquivos/ids/8009/relogio-masculino-digital.jpg', position: 0 }
];

async function insertMockupData() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado com sucesso!');
    
    // Inserir produtos
    console.log('🔄 Inserindo produtos mockup...');
    for (const product of mockupProducts) {
      const insertProductSQL = `
        INSERT INTO products (
          vtex_id, name, description, department_id, brand_id, category_id, is_active, is_visible,
          link_id, meta_tag_description, title, contexto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          department_id = VALUES(department_id),
          brand_id = VALUES(brand_id),
          category_id = VALUES(category_id),
          is_active = VALUES(is_active),
          is_visible = VALUES(is_visible),
          link_id = VALUES(link_id),
          meta_tag_description = VALUES(meta_tag_description),
          title = VALUES(title),
          contexto = VALUES(contexto),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(insertProductSQL, [
        product.vtex_id,
        product.name,
        product.description,
        product.department_id,
        product.brand_id,
        product.category_id,
        product.is_active,
        product.is_visible,
        product.link_id,
        product.meta_tag_description,
        product.title,
        product.context
      ]);
      
      console.log(`✅ Produto "${product.name}" inserido/atualizado`);
    }
    
    // Inserir SKUs
    console.log('🔄 Inserindo SKUs mockup...');
    for (const sku of mockupSkus) {
      const insertSkuSQL = `
        INSERT INTO skus (
          vtex_id, product_id, name, ref_id, is_active, contexto
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          product_id = VALUES(product_id),
          name = VALUES(name),
          ref_id = VALUES(ref_id),
          is_active = VALUES(is_active),
          contexto = VALUES(contexto),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(insertSkuSQL, [
        sku.vtex_id,
        sku.product_id,
        sku.name,
        sku.ref_id,
        sku.is_active,
        sku.context
      ]);
      
      console.log(`✅ SKU "${sku.name}" inserido/atualizado`);
    }
    
    // Inserir imagens
    console.log('🔄 Inserindo imagens mockup...');
    for (const image of mockupImages) {
      const insertImageSQL = `
        INSERT INTO images (
          vtex_id, archive_id, sku_id, name, is_main, text, file_location, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          archive_id = VALUES(archive_id),
          sku_id = VALUES(sku_id),
          name = VALUES(name),
          is_main = VALUES(is_main),
          text = VALUES(text),
          file_location = VALUES(file_location),
          position = VALUES(position),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(insertImageSQL, [
        image.vtex_id,
        image.archive_id,
        image.sku_id,
        image.name,
        image.is_main,
        image.text,
        image.file_location,
        image.position
      ]);
      
      console.log(`✅ Imagem "${image.name}" inserida/atualizada`);
    }
    
    console.log('✅ Todos os dados mockup foram inseridos com sucesso!');
    
    // Verificar os dados inseridos
    console.log('\n📋 Resumo dos dados inseridos:');
    
    const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as count FROM skus');
    const [imageCount] = await connection.execute('SELECT COUNT(*) as count FROM images');
    
    console.log(`📦 Produtos: ${productCount[0].count}`);
    console.log(`🏷️ SKUs: ${skuCount[0].count}`);
    console.log(`🖼️ Imagens: ${imageCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados mockup:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

// Executar
insertMockupData();

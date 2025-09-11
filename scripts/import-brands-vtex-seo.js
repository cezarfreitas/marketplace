// Script para importar marcas da VTEX para a tabela brands_vtex no banco seo_data
const mysql = require('mysql2/promise');

// Configuração do banco de dados seo_data
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3342,
  user: 'seo_data',
  password: '54779042baaa70be95c0',
  database: 'seo_data',
  charset: 'utf8mb4'
};

// Configuração da API VTEX
const VTEX_CONFIG = {
  baseUrl: 'https://projetoinfluencer.vtexcommercestable.com.br',
  appKey: 'vtexappkey-urbane-ONYTAV',
  appToken: 'LLLYPAYHDSBXCPLGTRIILHWSKRXUGSDRYBWPIVYZSAATWKTWGWLRJGFCZALNYDHZWWHVOYDVMHENKZJHPEUPVGUNVSMLJJOMUYRKBIPUTOQSJFOQNRKUGNIRAJSAVEMQ'
};

async function importBrandsVtex() {
  console.log('🚀 Iniciando importação de marcas da VTEX para banco seo_data...');
  
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');
    
    // Verificar se a tabela existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'seo_data' AND TABLE_NAME = 'brands_vtex'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela brands_vtex não existe. Execute primeiro o script create-brands-vtex-table-seo.js');
      return;
    }
    
    // Buscar marcas existentes no banco para importar
    console.log('🔍 Buscando marcas para importar...');
    const [brands] = await connection.execute(`
      SELECT DISTINCT brand_id as vtex_id 
      FROM products_vtex 
      WHERE brand_id IS NOT NULL 
      ORDER BY brand_id
    `);
    
    console.log(`📊 Encontradas ${brands.length} marcas para processar`);
    
    let totalImported = 0;
    let totalErrors = 0;
    
    // Processar cada marca
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const brandId = brand.vtex_id;
      
      try {
        console.log(`\n🏷️ Processando marca ${brandId} (${i + 1}/${brands.length})...`);
        
        // Buscar dados da marca na VTEX
        const brandData = await fetchVtexBrand(brandId);
        
        if (brandData) {
          console.log(`✅ Dados da marca ${brandData.name} encontrados`);
          
          // Inserir marca no banco
          try {
            await insertBrandVtex(connection, brandData);
            totalImported++;
            console.log(`✅ Marca ${brandData.name} importada`);
          } catch (error) {
            console.error(`❌ Erro ao inserir marca ${brandData.name}:`, error.message);
            totalErrors++;
          }
        } else {
          console.log(`⚠️ Dados da marca ${brandId} não encontrados na VTEX`);
        }
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Erro ao processar marca ${brandId}:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n✅ Importação concluída!`);
    console.log(`📊 Total de marcas importadas: ${totalImported}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    
    // Verificar resultado final
    const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM brands_vtex');
    console.log(`📊 Total de marcas na tabela brands_vtex: ${finalCount[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

async function fetchVtexBrand(brandId) {
  try {
    const url = `${VTEX_CONFIG.baseUrl}/api/catalog_system/pvt/brand/${brandId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VTEX-API-AppKey': VTEX_CONFIG.appKey,
        'X-VTEX-API-AppToken': VTEX_CONFIG.appToken
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ Marca ${brandId} não encontrada na VTEX`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const brandData = await response.json();
    return brandData;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar marca ${brandId}:`, error.message);
    return null;
  }
}

async function insertBrandVtex(connection, brand) {
  const sql = `
    INSERT INTO brands_vtex (
      vtex_id, name, is_active, title, meta_tag_description, image_url
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      is_active = VALUES(is_active),
      title = VALUES(title),
      meta_tag_description = VALUES(meta_tag_description),
      image_url = VALUES(image_url),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  const values = [
    brand.id || null,
    brand.name || null,
    brand.isActive === true ? 1 : 0,
    brand.title || null,
    brand.metaTagDescription || null,
    brand.imageUrl || null
  ];
  
  // Verificar se todos os valores obrigatórios estão presentes
  if (values[0] === null || values[1] === null) {
    throw new Error('Valores obrigatórios (vtex_id, name) não podem ser null');
  }
  
  await connection.execute(sql, values);
}

// Função para importar uma marca específica
async function importBrandForId(brandId) {
  console.log(`🚀 Importando marca ${brandId} no banco seo_data...`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');
    
    // Buscar dados da marca na VTEX
    const brandData = await fetchVtexBrand(brandId);
    
    if (brandData) {
      console.log(`✅ Dados da marca ${brandData.name} encontrados`);
      
      try {
        await insertBrandVtex(connection, brandData);
        console.log(`✅ Marca ${brandData.name} importada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao inserir marca:`, error.message);
      }
    } else {
      console.log(`⚠️ Dados da marca ${brandId} não encontrados na VTEX`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length > 0) {
  // Importar marca específica
  const brandId = parseInt(args[0]);
  if (isNaN(brandId)) {
    console.error('❌ Brand ID deve ser um número');
    process.exit(1);
  }
  importBrandForId(brandId);
} else {
  // Importar todas as marcas
  importBrandsVtex();
}

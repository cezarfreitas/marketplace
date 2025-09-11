// Script para importar imagens da VTEX para a tabela images_vtex
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  charset: 'utf8mb4'
};

// Configuração da API VTEX
const VTEX_CONFIG = {
  baseUrl: 'https://projetoinfluencer.vtexcommercestable.com.br',
  appKey: 'vtexappkey-urbane-ONYTAV',
  appToken: 'TOWYDCVLZSPSXSDEHFCKYDKATTPJQMVZPMRKLBJNICVVEMSWDDOQBIRPGIOBNNEMJOKNRCWZODANPIRQGCNWKGVWLZBHMHOIPHZPAMEQCGMBRILAUDXRFHVXQTRDBGTC'
};

async function importImagesVtex() {
  console.log('🚀 Iniciando importação de imagens da VTEX...');
  
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se a tabela existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'meli' AND TABLE_NAME = 'images_vtex'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela images_vtex não existe. Execute primeiro o script create-images-vtex-table.sql');
      return;
    }
    
    // Buscar SKUs para importar imagens
    console.log('🔍 Buscando SKUs para importar imagens...');
    const [skus] = await connection.execute(`
      SELECT DISTINCT vtex_id 
      FROM skus 
      WHERE vtex_id IS NOT NULL 
      ORDER BY vtex_id
    `);
    
    console.log(`📊 Encontrados ${skus.length} SKUs para processar`);
    
    let totalImported = 0;
    let totalErrors = 0;
    
    // Processar cada SKU
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const skuId = sku.vtex_id;
      
      try {
        console.log(`\n📦 Processando SKU ${skuId} (${i + 1}/${skus.length})...`);
        
        // Buscar imagens da VTEX
        const images = await fetchVtexImages(skuId);
        
        if (images && images.length > 0) {
          console.log(`🖼️ Encontradas ${images.length} imagens para SKU ${skuId}`);
          
          // Inserir imagens no banco
          for (const image of images) {
            try {
              await insertImageVtex(connection, image);
              totalImported++;
            } catch (error) {
              console.error(`❌ Erro ao inserir imagem ${image.Id}:`, error.message);
              totalErrors++;
            }
          }
        } else {
          console.log(`⚠️ Nenhuma imagem encontrada para SKU ${skuId}`);
        }
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro ao processar SKU ${skuId}:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n✅ Importação concluída!`);
    console.log(`📊 Total de imagens importadas: ${totalImported}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    
    // Verificar resultado final
    const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM images_vtex');
    console.log(`📊 Total de imagens na tabela images_vtex: ${finalCount[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

async function fetchVtexImages(skuId) {
  try {
    const url = `${VTEX_CONFIG.baseUrl}/api/catalog/pvt/stockkeepingunit/${skuId}/file`;
    
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const images = await response.json();
    return Array.isArray(images) ? images : [];
    
  } catch (error) {
    console.error(`❌ Erro ao buscar imagens do SKU ${skuId}:`, error.message);
    return [];
  }
}

async function insertImageVtex(connection, image) {
  const sql = `
    INSERT INTO images_vtex (
      vtex_id, archive_id, sku_id, name, is_main, 
      text, label, url, file_location, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      archive_id = VALUES(archive_id),
      sku_id = VALUES(sku_id),
      name = VALUES(name),
      is_main = VALUES(is_main),
      text = VALUES(text),
      label = VALUES(label),
      url = VALUES(url),
      file_location = VALUES(file_location),
      position = VALUES(position),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  const values = [
    image.Id,
    image.ArchiveId,
    image.SkuId,
    image.Name,
    image.IsMain || false,
    image.Text || null,
    image.Label || null,
    image.Url || null,
    image.FileLocation,
    image.Position || 0
  ];
  
  await connection.execute(sql, values);
}

// Função para importar imagens de um SKU específico
async function importImagesForSku(skuId) {
  console.log(`🚀 Importando imagens para SKU ${skuId}...`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Buscar imagens da VTEX
    const images = await fetchVtexImages(skuId);
    
    if (images && images.length > 0) {
      console.log(`🖼️ Encontradas ${images.length} imagens para SKU ${skuId}`);
      
      let imported = 0;
      for (const image of images) {
        try {
          await insertImageVtex(connection, image);
          imported++;
          console.log(`✅ Imagem ${image.Id} importada`);
        } catch (error) {
          console.error(`❌ Erro ao inserir imagem ${image.Id}:`, error.message);
        }
      }
      
      console.log(`✅ ${imported} imagens importadas para SKU ${skuId}`);
    } else {
      console.log(`⚠️ Nenhuma imagem encontrada para SKU ${skuId}`);
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
  // Importar para SKU específico
  const skuId = parseInt(args[0]);
  if (isNaN(skuId)) {
    console.error('❌ SKU ID deve ser um número');
    process.exit(1);
  }
  importImagesForSku(skuId);
} else {
  // Importar todos os SKUs
  importImagesVtex();
}

// Script para importar categorias da VTEX para a tabela categories_vtex no banco seo_data
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

async function importCategoriesVtex() {
  console.log('🚀 Iniciando importação de categorias da VTEX para banco seo_data...');
  
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');
    
    // Verificar se a tabela existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'seo_data' AND TABLE_NAME = 'categories_vtex'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela categories_vtex não existe. Execute primeiro o script create-categories-vtex-table-seo.js');
      return;
    }
    
    // Buscar categorias existentes no banco para importar
    console.log('🔍 Buscando categorias para importar...');
    const [categories] = await connection.execute(`
      SELECT DISTINCT category_id as vtex_id 
      FROM products_vtex 
      WHERE category_id IS NOT NULL 
      ORDER BY category_id
    `);
    
    console.log(`📊 Encontradas ${categories.length} categorias para processar`);
    
    let totalImported = 0;
    let totalErrors = 0;
    
    // Processar cada categoria
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const categoryId = category.vtex_id;
      
      try {
        console.log(`\n📁 Processando categoria ${categoryId} (${i + 1}/${categories.length})...`);
        
        // Buscar dados da categoria na VTEX
        const categoryData = await fetchVtexCategory(categoryId);
        
        if (categoryData) {
          console.log(`✅ Dados da categoria ${categoryData.Name} encontrados`);
          
          // Inserir categoria no banco
          try {
            await insertCategoryVtex(connection, categoryData);
            totalImported++;
            console.log(`✅ Categoria ${categoryData.Name} importada`);
          } catch (error) {
            console.error(`❌ Erro ao inserir categoria ${categoryData.Name}:`, error.message);
            totalErrors++;
          }
        } else {
          console.log(`⚠️ Dados da categoria ${categoryId} não encontrados na VTEX`);
        }
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Erro ao processar categoria ${categoryId}:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n✅ Importação concluída!`);
    console.log(`📊 Total de categorias importadas: ${totalImported}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    
    // Verificar resultado final
    const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM categories_vtex');
    console.log(`📊 Total de categorias na tabela categories_vtex: ${finalCount[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

async function fetchVtexCategory(categoryId) {
  try {
    const url = `${VTEX_CONFIG.baseUrl}/api/catalog/pvt/category/${categoryId}`;
    
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
        console.log(`⚠️ Categoria ${categoryId} não encontrada na VTEX`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const categoryData = await response.json();
    return categoryData;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar categoria ${categoryId}:`, error.message);
    return null;
  }
}

async function insertCategoryVtex(connection, category) {
  const sql = `
    INSERT INTO categories_vtex (
      vtex_id, name, father_category_id, title, description, keywords,
      is_active, lomadee_campaign_code, adwords_remarketing_code,
      show_in_store_front, show_brand_filter, active_store_front_link,
      global_category_id, stock_keeping_unit_selection_mode, score,
      link_id, has_children, tree_path, tree_path_ids, tree_path_link_ids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      father_category_id = VALUES(father_category_id),
      title = VALUES(title),
      description = VALUES(description),
      keywords = VALUES(keywords),
      is_active = VALUES(is_active),
      lomadee_campaign_code = VALUES(lomadee_campaign_code),
      adwords_remarketing_code = VALUES(adwords_remarketing_code),
      show_in_store_front = VALUES(show_in_store_front),
      show_brand_filter = VALUES(show_brand_filter),
      active_store_front_link = VALUES(active_store_front_link),
      global_category_id = VALUES(global_category_id),
      stock_keeping_unit_selection_mode = VALUES(stock_keeping_unit_selection_mode),
      score = VALUES(score),
      link_id = VALUES(link_id),
      has_children = VALUES(has_children),
      tree_path = VALUES(tree_path),
      tree_path_ids = VALUES(tree_path_ids),
      tree_path_link_ids = VALUES(tree_path_link_ids),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  const values = [
    category.Id,
    category.Name,
    category.FatherCategoryId || null,
    category.Title || null,
    category.Description || null,
    category.Keywords || null,
    category.IsActive || true,
    category.LomadeeCampaignCode || null,
    category.AdWordsRemarketingCode || null,
    category.ShowInStoreFront || true,
    category.ShowBrandFilter || true,
    category.ActiveStoreFrontLink || true,
    category.GlobalCategoryId || 0,
    category.StockKeepingUnitSelectionMode || null,
    category.Score || 0,
    category.LinkId || null,
    category.HasChildren || false,
    category.TreePath || null,
    category.TreePathIds || null,
    category.TreePathLinkIds || null
  ];
  
  await connection.execute(sql, values);
}

// Função para importar uma categoria específica
async function importCategoryForId(categoryId) {
  console.log(`🚀 Importando categoria ${categoryId} no banco seo_data...`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');
    
    // Buscar dados da categoria na VTEX
    const categoryData = await fetchVtexCategory(categoryId);
    
    if (categoryData) {
      console.log(`✅ Dados da categoria ${categoryData.Name} encontrados`);
      
      try {
        await insertCategoryVtex(connection, categoryData);
        console.log(`✅ Categoria ${categoryData.Name} importada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao inserir categoria:`, error.message);
      }
    } else {
      console.log(`⚠️ Dados da categoria ${categoryId} não encontrados na VTEX`);
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
  // Importar categoria específica
  const categoryId = parseInt(args[0]);
  if (isNaN(categoryId)) {
    console.error('❌ Category ID deve ser um número');
    process.exit(1);
  }
  importCategoryForId(categoryId);
} else {
  // Importar todas as categorias
  importCategoriesVtex();
}

const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugAnalysisButton() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando estrutura da tabela analise_imagens...');
    
    // 1. Verificar estrutura da tabela
    const [tableStructure] = await connection.execute('DESCRIBE analise_imagens');
    console.log('\n📋 Estrutura da tabela analise_imagens:');
    console.table(tableStructure);

    // 2. Verificar se há dados na tabela
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM analise_imagens');
    console.log(`\n📊 Total de registros na tabela analise_imagens: ${countResult[0].total}`);

    // 3. Verificar alguns registros de exemplo
    const [sampleData] = await connection.execute(`
      SELECT 
        id,
        id_produto_vtex,
        created_at,
        contextualizacao,
        product_type
      FROM analise_imagens 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Exemplos de registros:');
    console.table(sampleData);

    // 4. Verificar se há produtos com análise
    const [productsWithAnalysis] = await connection.execute(`
      SELECT DISTINCT id_produto_vtex 
      FROM analise_imagens 
      ORDER BY id_produto_vtex
    `);
    
    console.log('\n📋 Produtos com análise:');
    console.log(productsWithAnalysis.map(p => p.id_produto_vtex));

    // 5. Testar a query que o endpoint usa
    console.log('\n🔍 Testando query do endpoint analysis-logs-simple...');
    const [logs] = await connection.execute(`
      SELECT 
        id_produto_vtex as product_id, 
        COALESCE((SELECT ref_produto FROM products_vtex WHERE id_produto_vtex = analise_imagens.id_produto_vtex), 'N/A') as product_ref_id,
        'image_analysis' as analysis_type, 
        openai_model as model_used, 
        openai_tokens_used as tokens_used, 
        openai_cost,
        1 as success, 
        created_at, 
        contextualizacao as contextual_analysis,
        product_type, 
        valid_images as image_count, 
        invalid_images as invalid_image_count, 
        analysis_quality,
        analysis_duration_ms, 
        openai_response_time_ms, 
        openai_max_tokens as max_tokens,
        COALESCE(agent_name, 'Agente de Imagens') as agent_name
      FROM analise_imagens
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Resultado da query do endpoint:');
    console.table(logs);

    // 6. Verificar se há produtos na tabela products_vtex que têm análise
    const [productsWithAnalysisCheck] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.name,
        p.ref_produto,
        CASE WHEN ai.id_produto_vtex IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_analise
      FROM products_vtex p
      LEFT JOIN analise_imagens ai ON p.id_produto_vtex = ai.id_produto_vtex
      WHERE ai.id_produto_vtex IS NOT NULL
      ORDER BY p.id_produto_vtex
      LIMIT 10
    `);
    
    console.log('\n📋 Produtos que deveriam ter botão verde:');
    console.table(productsWithAnalysisCheck);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

// Executar a função
debugAnalysisButton();

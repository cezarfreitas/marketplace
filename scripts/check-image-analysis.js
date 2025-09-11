const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkImageAnalysis() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar se a tabela image_analysis_logs existe
    console.log('🔍 Verificando se a tabela image_analysis_logs existe...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'image_analysis_logs'
      `);
      
      if (tables.length === 0) {
        console.log('❌ Tabela image_analysis_logs não existe!');
        console.log('📝 Isso significa que não há análises de imagem disponíveis.');
        return;
      }
      
      console.log('✅ Tabela image_analysis_logs existe!');
    } catch (error) {
      console.log('❌ Erro ao verificar tabela:', error.message);
      return;
    }

    // Verificar análises de imagem existentes
    console.log('\n🔍 Verificando análises de imagem existentes...');
    const [imageAnalyses] = await connection.execute(`
      SELECT 
        ial.*,
        a.name as agent_name,
        p.name as product_name
      FROM image_analysis_logs ial
      LEFT JOIN agents a ON ial.agent_id = a.id
      LEFT JOIN products_vtex p ON ial.product_id = p.id
      ORDER BY ial.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📊 Total de análises encontradas: ${imageAnalyses.length}`);
    
    if (imageAnalyses.length > 0) {
      console.log('\n📋 Últimas análises de imagem:');
      imageAnalyses.forEach((analysis, index) => {
        console.log(`\n${index + 1}. ID: ${analysis.id}`);
        console.log(`   - Produto: ${analysis.product_name} (ID: ${analysis.product_id})`);
        console.log(`   - Agente: ${analysis.agent_name || 'N/A'}`);
        console.log(`   - Status: ${analysis.status}`);
        console.log(`   - Criado em: ${analysis.created_at}`);
        console.log(`   - Análise contextual: ${analysis.contextual_analysis ? 'Disponível' : 'N/A'}`);
        
        if (analysis.contextual_analysis) {
          console.log(`   - Preview da análise: ${analysis.contextual_analysis.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('❌ Nenhuma análise de imagem encontrada');
    }

    // Verificar produtos que têm análises de imagem
    console.log('\n🔍 Verificando produtos com análises de imagem...');
    const [productsWithAnalysis] = await connection.execute(`
      SELECT 
        p.id, p.name, p.ref_id,
        COUNT(ial.id) as analysis_count,
        MAX(ial.created_at) as last_analysis
      FROM products_vtex p
      LEFT JOIN image_analysis_logs ial ON p.id = ial.product_id
      GROUP BY p.id, p.name, p.ref_id
      HAVING analysis_count > 0
      ORDER BY last_analysis DESC
      LIMIT 5
    `);
    
    console.log(`📊 Produtos com análises: ${productsWithAnalysis.length}`);
    
    if (productsWithAnalysis.length > 0) {
      console.log('\n📋 Produtos com análises de imagem:');
      productsWithAnalysis.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (ID: ${product.id}) - ${product.analysis_count} análise(s) - Última: ${product.last_analysis}`);
      });
    }

    // Verificar se há produtos com marketplace description mas sem análise de imagem
    console.log('\n🔍 Verificando produtos com marketplace description...');
    const [marketplaceProducts] = await connection.execute(`
      SELECT 
        m.product_id, p.name, p.ref_id,
        m.title, m.status, m.created_at as marketplace_created,
        ial.id as has_analysis
      FROM marketplace m
      LEFT JOIN products_vtex p ON m.product_id = p.id
      LEFT JOIN image_analysis_logs ial ON m.product_id = ial.product_id
      ORDER BY m.created_at DESC
    `);
    
    console.log(`📊 Produtos com marketplace description: ${marketplaceProducts.length}`);
    
    if (marketplaceProducts.length > 0) {
      console.log('\n📋 Produtos com marketplace description:');
      marketplaceProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name} (ID: ${product.product_id})`);
        console.log(`   - Título: "${product.title}"`);
        console.log(`   - Status: ${product.status}`);
        console.log(`   - Criado em: ${product.marketplace_created}`);
        console.log(`   - Tem análise de imagem: ${product.has_analysis ? 'Sim' : 'Não'}`);
      });
    }

    // Verificar estrutura da tabela image_analysis_logs
    console.log('\n🔍 Verificando estrutura da tabela image_analysis_logs...');
    const [structure] = await connection.execute('DESCRIBE image_analysis_logs');
    console.log('📊 Campos da tabela:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type}`);
    });

    console.log('\n🎉 Verificação de análise de imagem concluída!');
    
    if (imageAnalyses.length === 0) {
      console.log('\n⚠️ ATENÇÃO: Não há análises de imagem disponíveis!');
      console.log('📝 Para usar análise de imagem na geração de marketplace:');
      console.log('   1. Execute a análise de imagens primeiro');
      console.log('   2. Depois gere a descrição do marketplace');
    } else {
      console.log('\n✅ Análises de imagem disponíveis!');
      console.log('📝 O sistema pode usar essas análises para gerar descrições mais precisas.');
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkImageAnalysis()
    .then(() => {
      console.log('🎉 Verificação executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { checkImageAnalysis };

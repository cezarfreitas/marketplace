const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkImageAnalysisTable() {
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
        console.log('📝 Vamos verificar se existe analise_imagens...');
        
        const [tables2] = await connection.execute(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'analise_imagens'
        `);
        
        if (tables2.length > 0) {
          console.log('✅ Tabela analise_imagens existe!');
          
          // Verificar estrutura da tabela analise_imagens
          console.log('\n📊 Estrutura da tabela analise_imagens:');
          const [structure] = await connection.execute('DESCRIBE analise_imagens');
          console.table(structure);
          
          // Verificar dados existentes
          const [data] = await connection.execute(`
            SELECT COUNT(*) as total FROM analise_imagens
          `);
          console.log(`\n📊 Total de registros: ${data[0].total}`);
          
          if (data[0].total > 0) {
            const [sample] = await connection.execute(`
              SELECT * FROM analise_imagens LIMIT 1
            `);
            console.log('\n📋 Exemplo de registro:');
            console.table(sample[0]);
          }
        } else {
          console.log('❌ Nenhuma tabela de análise de imagem encontrada!');
        }
        return;
      }
      
      console.log('✅ Tabela image_analysis_logs existe!');
    } catch (error) {
      console.log('❌ Erro ao verificar tabelas:', error.message);
      return;
    }

    // Verificar estrutura da tabela image_analysis_logs
    console.log('\n📊 Estrutura da tabela image_analysis_logs:');
    const [structure] = await connection.execute('DESCRIBE image_analysis_logs');
    console.table(structure);

    // Verificar se tem as colunas padronizadas
    console.log('\n🔍 Verificando colunas padronizadas da OpenAI:');
    const requiredColumns = [
      'openai_model',
      'openai_tokens_used', 
      'openai_tokens_prompt',
      'openai_tokens_completion',
      'openai_cost',
      'openai_request_id',
      'openai_response_time_ms',
      'status',
      'error_message',
      'generated_at'
    ];
    
    const existingColumns = structure.map(field => field.Field);
    
    requiredColumns.forEach(column => {
      if (existingColumns.includes(column)) {
        console.log(`✅ ${column}: Existe`);
      } else {
        console.log(`❌ ${column}: NÃO EXISTE`);
      }
    });

    // Verificar dados existentes
    const [data] = await connection.execute(`
      SELECT COUNT(*) as total FROM image_analysis_logs
    `);
    console.log(`\n📊 Total de registros: ${data[0].total}`);
    
    if (data[0].total > 0) {
      const [sample] = await connection.execute(`
        SELECT * FROM image_analysis_logs LIMIT 1
      `);
      console.log('\n📋 Exemplo de registro:');
      console.table(sample[0]);
    }

    console.log('\n🎉 Verificação da tabela de análise de imagem concluída!');

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
  checkImageAnalysisTable()
    .then(() => {
      console.log('🎉 Verificação executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { checkImageAnalysisTable };

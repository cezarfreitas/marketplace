import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🔧 Criando tabelas que estão faltando...');

    // 1. Criar tabela titles
    console.log('📝 Criando tabela titles...');
    const titlesSQL = `
      CREATE TABLE IF NOT EXISTS \`titles\` (
        \`id_product_vtex\` int NOT NULL COMMENT 'ID do produto (FK para products_vtex)',
        \`title\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Título gerado pela IA',
        \`original_title\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Título original do produto',
        \`openai_model\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Modelo OpenAI utilizado',
        \`openai_tokens_used\` int DEFAULT NULL COMMENT 'Total de tokens utilizados',
        \`openai_tokens_prompt\` int DEFAULT NULL COMMENT 'Tokens usados no prompt',
        \`openai_tokens_completion\` int DEFAULT NULL COMMENT 'Tokens usados na resposta',
        \`openai_temperature\` decimal(3,2) DEFAULT NULL COMMENT 'Temperatura do modelo',
        \`openai_max_tokens\` int DEFAULT NULL COMMENT 'Máximo de tokens configurado',
        \`openai_response_time_ms\` int DEFAULT NULL COMMENT 'Tempo de resposta da OpenAI em ms',
        \`openai_cost\` decimal(10,6) DEFAULT NULL COMMENT 'Custo da requisição em USD',
        \`openai_request_id\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID da requisição OpenAI',
        \`generation_duration_ms\` int DEFAULT NULL COMMENT 'Duração total da geração em ms',
        \`generation_attempts\` int DEFAULT '1' COMMENT 'Número de tentativas de geração',
        \`is_unique\` tinyint(1) DEFAULT '0' COMMENT 'Se o título é único no sistema',
        \`validation_passed\` tinyint(1) DEFAULT '0' COMMENT 'Se passou na validação de unicidade',
        \`status\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'generated' COMMENT 'Status: generated, validated, error',
        \`error_message\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Mensagem de erro se houver',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id_product_vtex\`),
        UNIQUE KEY \`unique_product_title\` (\`id_product_vtex\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_is_unique\` (\`is_unique\`),
        KEY \`idx_validation_passed\` (\`validation_passed\`),
        KEY \`idx_created_at\` (\`created_at\`),
        KEY \`idx_openai_request_id\` (\`openai_request_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Títulos de produtos gerados por IA'
    `;

    // 2. Criar tabela anymarket_sync_logs
    console.log('📝 Criando tabela anymarket_sync_logs...');
    const anymarketSyncLogsSQL = `
      CREATE TABLE IF NOT EXISTS \`anymarket_sync_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`product_id\` int NOT NULL COMMENT 'ID do produto (FK para products_vtex)',
        \`sync_type\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'product' COMMENT 'Tipo de sincronização: product, stock, image',
        \`status\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Status: pending, success, error',
        \`success\` tinyint(1) DEFAULT '0' COMMENT 'Se a sincronização foi bem-sucedida',
        \`response_data\` json DEFAULT NULL COMMENT 'Dados da resposta da API Anymarket',
        \`error_message\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Mensagem de erro se houver',
        \`anymarket_product_id\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket',
        \`sync_duration_ms\` int DEFAULT NULL COMMENT 'Duração da sincronização em ms',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_product_id\` (\`product_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_sync_type\` (\`sync_type\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs de sincronização com Anymarket'
    `;

    // 3. Criar tabela crop_processing_logs
    console.log('📝 Criando tabela crop_processing_logs...');
    const cropProcessingLogsSQL = `
      CREATE TABLE IF NOT EXISTS \`crop_processing_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`product_id\` int NOT NULL COMMENT 'ID do produto (FK para products_vtex)',
        \`status\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Status: pending, processing, completed, error',
        \`total_images\` int DEFAULT '0' COMMENT 'Total de imagens para processar',
        \`processed_images\` int DEFAULT '0' COMMENT 'Imagens já processadas',
        \`failed_images\` int DEFAULT '0' COMMENT 'Imagens que falharam',
        \`error_message\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Mensagem de erro se houver',
        \`processing_duration_ms\` int DEFAULT NULL COMMENT 'Duração do processamento em ms',
        \`started_at\` timestamp NULL DEFAULT NULL COMMENT 'Data/hora de início do processamento',
        \`completed_at\` timestamp NULL DEFAULT NULL COMMENT 'Data/hora de conclusão',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_product_id\` (\`product_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs de processamento de crop de imagens'
    `;

    // Executar as queries
    const results = [];
    
    try {
      await executeQuery(titlesSQL);
      results.push('✅ Tabela titles criada com sucesso');
      console.log('✅ Tabela titles criada com sucesso');
    } catch (error: any) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push('⚠️ Tabela titles já existe');
        console.log('⚠️ Tabela titles já existe');
      } else {
        results.push(`❌ Erro ao criar tabela titles: ${error.message}`);
        console.log('❌ Erro ao criar tabela titles:', error.message);
      }
    }

    try {
      await executeQuery(anymarketSyncLogsSQL);
      results.push('✅ Tabela anymarket_sync_logs criada com sucesso');
      console.log('✅ Tabela anymarket_sync_logs criada com sucesso');
    } catch (error: any) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push('⚠️ Tabela anymarket_sync_logs já existe');
        console.log('⚠️ Tabela anymarket_sync_logs já existe');
      } else {
        results.push(`❌ Erro ao criar tabela anymarket_sync_logs: ${error.message}`);
        console.log('❌ Erro ao criar tabela anymarket_sync_logs:', error.message);
      }
    }

    try {
      await executeQuery(cropProcessingLogsSQL);
      results.push('✅ Tabela crop_processing_logs criada com sucesso');
      console.log('✅ Tabela crop_processing_logs criada com sucesso');
    } catch (error: any) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push('⚠️ Tabela crop_processing_logs já existe');
        console.log('⚠️ Tabela crop_processing_logs já existe');
      } else {
        results.push(`❌ Erro ao criar tabela crop_processing_logs: ${error.message}`);
        console.log('❌ Erro ao criar tabela crop_processing_logs:', error.message);
      }
    }

    // Adicionar foreign keys
    console.log('🔗 Adicionando foreign keys...');
    
    try {
      await executeQuery(`
        ALTER TABLE \`titles\` 
        ADD CONSTRAINT \`fk_titles_product\` 
        FOREIGN KEY (\`id_product_vtex\`) REFERENCES \`products_vtex\` (\`id_produto_vtex\`) ON DELETE CASCADE
      `);
      results.push('✅ Foreign key titles -> products_vtex adicionada');
      console.log('✅ Foreign key titles -> products_vtex adicionada');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        results.push('⚠️ Foreign key titles já existe');
        console.log('⚠️ Foreign key titles já existe');
      } else {
        results.push(`❌ Erro ao adicionar foreign key titles: ${error.message}`);
        console.log('❌ Erro ao adicionar foreign key titles:', error.message);
      }
    }

    try {
      await executeQuery(`
        ALTER TABLE \`anymarket_sync_logs\` 
        ADD CONSTRAINT \`fk_anymarket_sync_logs_product\` 
        FOREIGN KEY (\`product_id\`) REFERENCES \`products_vtex\` (\`id_produto_vtex\`) ON DELETE CASCADE
      `);
      results.push('✅ Foreign key anymarket_sync_logs -> products_vtex adicionada');
      console.log('✅ Foreign key anymarket_sync_logs -> products_vtex adicionada');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        results.push('⚠️ Foreign key anymarket_sync_logs já existe');
        console.log('⚠️ Foreign key anymarket_sync_logs já existe');
      } else {
        results.push(`❌ Erro ao adicionar foreign key anymarket_sync_logs: ${error.message}`);
        console.log('❌ Erro ao adicionar foreign key anymarket_sync_logs:', error.message);
      }
    }

    try {
      await executeQuery(`
        ALTER TABLE \`crop_processing_logs\` 
        ADD CONSTRAINT \`fk_crop_processing_logs_product\` 
        FOREIGN KEY (\`product_id\`) REFERENCES \`products_vtex\` (\`id_produto_vtex\`) ON DELETE CASCADE
      `);
      results.push('✅ Foreign key crop_processing_logs -> products_vtex adicionada');
      console.log('✅ Foreign key crop_processing_logs -> products_vtex adicionada');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        results.push('⚠️ Foreign key crop_processing_logs já existe');
        console.log('⚠️ Foreign key crop_processing_logs já existe');
      } else {
        results.push(`❌ Erro ao adicionar foreign key crop_processing_logs: ${error.message}`);
        console.log('❌ Erro ao adicionar foreign key crop_processing_logs:', error.message);
      }
    }

    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    const tables = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('titles', 'anymarket_sync_logs', 'crop_processing_logs')
    `);

    const tableNames = tables.map(t => t.TABLE_NAME);
    results.push(`📊 Tabelas encontradas: ${tableNames.join(', ')}`);
    console.log('📊 Tabelas encontradas:', tableNames);

    return NextResponse.json({
      success: true,
      message: 'Script executado com sucesso!',
      results,
      tablesCreated: tableNames
    });

  } catch (error: any) {
    console.error('❌ Erro ao executar script:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar script',
      error: error.message
    }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🔧 Criando tabela anymarket_sinc...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`anymarket_sinc\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`id_produto_vtex\` int NOT NULL COMMENT 'ID do produto VTEX',
        \`ref_produto_vtex\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Referência do produto VTEX',
        \`id_produto_any\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket',
        \`status\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Status: pending, synced, error, failed',
        \`sync_type\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'product' COMMENT 'Tipo de sincronização: product, stock, image, price',
        \`action\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'create' COMMENT 'Ação: create, update, delete',
        \`success\` tinyint(1) DEFAULT '0' COMMENT 'Se a sincronização foi bem-sucedida',
        \`attempts\` int DEFAULT '0' COMMENT 'Número de tentativas de sincronização',
        \`max_attempts\` int DEFAULT '3' COMMENT 'Número máximo de tentativas',
        \`response_data\` json DEFAULT NULL COMMENT 'Dados da resposta da API Anymarket',
        \`error_message\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Mensagem de erro se houver',
        \`sync_duration_ms\` int DEFAULT NULL COMMENT 'Duração da sincronização em ms',
        \`last_attempt_at\` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da última tentativa',
        \`synced_at\` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da sincronização bem-sucedida',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_id_produto_vtex\` (\`id_produto_vtex\`),
        KEY \`idx_ref_produto_vtex\` (\`ref_produto_vtex\`),
        KEY \`idx_id_produto_any\` (\`id_produto_any\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_sync_type\` (\`sync_type\`),
        KEY \`idx_action\` (\`action\`),
        KEY \`idx_success\` (\`success\`),
        KEY \`idx_created_at\` (\`created_at\`),
        KEY \`idx_synced_at\` (\`synced_at\`),
        KEY \`idx_last_attempt_at\` (\`last_attempt_at\`),
        UNIQUE KEY \`unique_produto_sync\` (\`id_produto_vtex\`, \`sync_type\`, \`action\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de sincronização com Anymarket - versão simplificada'
    `;

    // Executar a query de criação
    await executeQuery(createTableSQL);
    console.log('✅ Tabela anymarket_sinc criada com sucesso');

    // Verificar se a tabela foi criada
    const tables = await executeQuery(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sinc'
    `);

    // Obter estrutura da tabela
    const structure = await executeQuery(`DESCRIBE anymarket_sinc`);

    return NextResponse.json({
      success: true,
      message: 'Tabela anymarket_sinc criada com sucesso!',
      table: tables[0] || null,
      structure: structure,
      columns: structure.length
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar tabela anymarket_sinc:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar tabela anymarket_sinc',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Verificar se a tabela existe
    const tables = await executeQuery(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sinc'
    `);

    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela anymarket_sinc não existe',
        exists: false
      });
    }

    // Obter estrutura da tabela
    const structure = await executeQuery(`DESCRIBE anymarket_sinc`);

    // Contar registros
    const countResult = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sinc`);
    const totalRecords = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      message: 'Tabela anymarket_sinc encontrada',
      exists: true,
      table: tables[0],
      structure: structure,
      columns: structure.length,
      totalRecords: totalRecords
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabela anymarket_sinc:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar tabela anymarket_sinc',
      error: error.message
    }, { status: 500 });
  }
}

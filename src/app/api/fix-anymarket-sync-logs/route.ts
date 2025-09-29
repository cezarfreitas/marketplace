import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🔧 Iniciando correção da tabela anymarket_sync_logs...');

    const results = [];

    // 1. Verificar se a tabela existe
    console.log('📝 Verificando se a tabela anymarket_sync_logs existe...');
    const tableExists = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sync_logs'
    `);

    if (tableExists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela anymarket_sync_logs não existe. Execute primeiro o script de criação de tabelas.'
      });
    }

    results.push('✅ Tabela anymarket_sync_logs existe');

    // 2. Mostrar estrutura atual
    console.log('📋 Verificando estrutura atual da tabela...');
    const currentStructure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    results.push({
      step: 'estrutura_atual',
      columns: currentStructure.length,
      structure: currentStructure
    });

    // 3. Verificar colunas existentes
    const anymarketIdExists = currentStructure.some((col: any) => col.Field === 'anymarket_id');
    const productIdExists = currentStructure.some((col: any) => col.Field === 'product_id');
    const idProdutoVtexExists = currentStructure.some((col: any) => col.Field === 'id_produto_vtex');
    const idProdutoAnyExists = currentStructure.some((col: any) => col.Field === 'id_produto_any');

    console.log('🔍 anymarket_id existe:', anymarketIdExists);
    console.log('🔍 product_id existe:', productIdExists);
    console.log('🔍 id_produto_vtex existe:', idProdutoVtexExists);
    console.log('🔍 id_produto_any existe:', idProdutoAnyExists);

    // 4. Renomear coluna anymarket_id para id_produto_any se necessário
    if (anymarketIdExists && !idProdutoAnyExists) {
      console.log('🔄 Renomeando coluna anymarket_id para id_produto_any...');
      try {
        await executeQuery(`
          ALTER TABLE \`anymarket_sync_logs\` 
          CHANGE COLUMN \`anymarket_id\` \`id_produto_any\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket'
        `);
        results.push('✅ Coluna anymarket_id renomeada para id_produto_any');
        console.log('✅ Coluna anymarket_id renomeada para id_produto_any');
      } catch (error: any) {
        results.push(`❌ Erro ao renomear coluna anymarket_id: ${error.message}`);
        console.error('❌ Erro ao renomear coluna anymarket_id:', error.message);
      }
    } else if (!idProdutoAnyExists) {
      console.log('➕ Adicionando coluna id_produto_any...');
      try {
        await executeQuery(`
          ALTER TABLE \`anymarket_sync_logs\` 
          ADD COLUMN \`id_produto_any\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket'
        `);
        results.push('✅ Coluna id_produto_any adicionada');
        console.log('✅ Coluna id_produto_any adicionada');
      } catch (error: any) {
        results.push(`❌ Erro ao adicionar coluna id_produto_any: ${error.message}`);
        console.error('❌ Erro ao adicionar coluna id_produto_any:', error.message);
      }
    } else {
      results.push('ℹ️ Coluna id_produto_any já existe');
      console.log('ℹ️ Coluna id_produto_any já existe');
    }

    // 5. Renomear coluna product_id para id_produto_vtex se necessário
    if (productIdExists && !idProdutoVtexExists) {
      console.log('🔄 Renomeando coluna product_id para id_produto_vtex...');
      try {
        await executeQuery(`
          ALTER TABLE \`anymarket_sync_logs\` 
          CHANGE COLUMN \`product_id\` \`id_produto_vtex\` int NOT NULL COMMENT 'ID do produto VTEX'
        `);
        results.push('✅ Coluna product_id renomeada para id_produto_vtex');
        console.log('✅ Coluna product_id renomeada para id_produto_vtex');
      } catch (error: any) {
        results.push(`❌ Erro ao renomear coluna product_id: ${error.message}`);
        console.error('❌ Erro ao renomear coluna product_id:', error.message);
      }
    } else if (!idProdutoVtexExists) {
      console.log('➕ Adicionando coluna id_produto_vtex...');
      try {
        await executeQuery(`
          ALTER TABLE \`anymarket_sync_logs\` 
          ADD COLUMN \`id_produto_vtex\` int NOT NULL COMMENT 'ID do produto VTEX'
        `);
        results.push('✅ Coluna id_produto_vtex adicionada');
        console.log('✅ Coluna id_produto_vtex adicionada');
      } catch (error: any) {
        results.push(`❌ Erro ao adicionar coluna id_produto_vtex: ${error.message}`);
        console.error('❌ Erro ao adicionar coluna id_produto_vtex:', error.message);
      }
    } else {
      results.push('ℹ️ Coluna id_produto_vtex já existe');
      console.log('ℹ️ Coluna id_produto_vtex já existe');
    }

    // 6. Adicionar outras colunas que podem estar faltando
    const columnsToAdd = [
      {
        name: 'title',
        definition: 'varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT \'Título do produto\''
      },
      {
        name: 'description',
        definition: 'text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT \'Descrição do produto\''
      },
      {
        name: 'sync_type',
        definition: 'varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT \'info\' COMMENT \'Tipo de sincronização: info (informações), crop (recorte de imagens), product, stock, image, price\''
      },
      {
        name: 'action',
        definition: 'varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT \'create\' COMMENT \'Ação: create, update, delete\''
      }
    ];

    for (const column of columnsToAdd) {
      const columnExists = currentStructure.some((col: any) => col.Field === column.name);
      if (!columnExists) {
        console.log(`➕ Adicionando coluna ${column.name}...`);
        try {
          await executeQuery(`
            ALTER TABLE \`anymarket_sync_logs\` 
            ADD COLUMN \`${column.name}\` ${column.definition}
          `);
          results.push(`✅ Coluna ${column.name} adicionada`);
          console.log(`✅ Coluna ${column.name} adicionada`);
        } catch (error: any) {
          results.push(`❌ Erro ao adicionar coluna ${column.name}: ${error.message}`);
          console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
        }
      } else {
        results.push(`ℹ️ Coluna ${column.name} já existe`);
        console.log(`ℹ️ Coluna ${column.name} já existe`);
      }
    }

    // 7. Adicionar índices se não existirem
    const indexesToAdd = [
      { name: 'idx_id_produto_vtex', column: 'id_produto_vtex' },
      { name: 'idx_id_produto_any', column: 'id_produto_any' },
      { name: 'idx_sync_type', column: 'sync_type' },
      { name: 'idx_action', column: 'action' }
    ];

    for (const index of indexesToAdd) {
      try {
        await executeQuery(`
          ALTER TABLE \`anymarket_sync_logs\` 
          ADD INDEX IF NOT EXISTS \`${index.name}\` (\`${index.column}\`)
        `);
        results.push(`✅ Índice ${index.name} adicionado`);
        console.log(`✅ Índice ${index.name} adicionado`);
      } catch (error: any) {
        results.push(`❌ Erro ao adicionar índice ${index.name}: ${error.message}`);
        console.error(`❌ Erro ao adicionar índice ${index.name}:`, error.message);
      }
    }

    // 7. Mostrar estrutura final
    console.log('📋 Verificando estrutura final da tabela...');
    const finalStructure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    results.push({
      step: 'estrutura_final',
      columns: finalStructure.length,
      structure: finalStructure
    });

    // 8. Mostrar índices
    const indexes = await executeQuery(`SHOW INDEX FROM anymarket_sync_logs`);
    results.push({
      step: 'indices',
      count: indexes.length,
      indexes: indexes
    });

    console.log('✅ Correção da tabela anymarket_sync_logs concluída');

    return NextResponse.json({
      success: true,
      message: 'Tabela anymarket_sync_logs corrigida com sucesso',
      results: results,
      summary: {
        totalSteps: results.length,
        finalColumns: finalStructure.length,
        totalIndexes: indexes.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao corrigir tabela anymarket_sync_logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao corrigir tabela anymarket_sync_logs',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 Verificando estrutura da tabela anymarket_sync_logs...');

    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sync_logs'
    `);

    if (tableExists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela anymarket_sync_logs não existe'
      });
    }

    // Mostrar estrutura da tabela
    const structure = await executeQuery(`DESCRIBE anymarket_sync_logs`);
    
    // Mostrar índices
    const indexes = await executeQuery(`SHOW INDEX FROM anymarket_sync_logs`);
    
    // Contar registros
    const count = await executeQuery(`SELECT COUNT(*) as total FROM anymarket_sync_logs`);

    return NextResponse.json({
      success: true,
      message: 'Estrutura da tabela anymarket_sync_logs verificada',
      data: {
        tableExists: true,
        structure: structure,
        columns: structure.length,
        indexes: indexes,
        totalIndexes: indexes.length,
        totalRecords: count[0]?.total || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabela anymarket_sync_logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar tabela anymarket_sync_logs',
      error: error.message
    }, { status: 500 });
  }
}

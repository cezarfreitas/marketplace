import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Iniciando limpeza de todos os dados de produtos...');

    // Lista de tabelas relacionadas aos produtos (em ordem de dependência)
    const tablesToClean = [
      'image_analysis_logs',     // Logs de análise de imagens
      'product_videos',          // Vídeos de produtos
      'product_images',          // Imagens de produtos
      'stock',                   // Estoque
      'skus',                    // SKUs
      'products',                // Produtos
      'brands',                  // Marcas
      'categories',              // Categorias
      'meli',                    // Dados do marketplace
      'anymarket',               // Dados do anymarket
      'import_logs',             // Logs de importação
    ];

    const results: { [key: string]: number } = {};
    let totalDeleted = 0;

    // Verificar dados antes da limpeza
    console.log('📊 Verificando dados antes da limpeza...');
    const beforeCounts: { [key: string]: number } = {};
    
    for (const table of tablesToClean) {
      try {
        const [countResult] = await executeQuery(`SELECT COUNT(*) as total FROM ${table}`);
        beforeCounts[table] = countResult[0]?.total || 0;
        console.log(`   - ${table}: ${beforeCounts[table]} registros`);
      } catch (error) {
        console.log(`   - ${table}: tabela não existe ou erro ao contar`);
        beforeCounts[table] = 0;
      }
    }

    // Executar limpeza
    console.log('🗑️ Executando limpeza...');
    
    for (const table of tablesToClean) {
      try {
        const [deleteResult] = await executeQuery(`DELETE FROM ${table}`);
        const affectedRows = deleteResult.affectedRows || 0;
        results[table] = affectedRows;
        totalDeleted += affectedRows;
        console.log(`✅ ${table}: ${affectedRows} registros deletados`);
      } catch (error: any) {
        console.log(`⚠️ ${table}: ${error.message}`);
        results[table] = 0;
      }
    }

    // Verificar dados após a limpeza
    console.log('📊 Verificando dados após a limpeza...');
    const afterCounts: { [key: string]: number } = {};
    
    for (const table of tablesToClean) {
      try {
        const [countResult] = await executeQuery(`SELECT COUNT(*) as total FROM ${table}`);
        afterCounts[table] = countResult[0]?.total || 0;
      } catch (error) {
        afterCounts[table] = 0;
      }
    }

    // Verificar se as configurações foram preservadas
    const [configCount] = await executeQuery(`SELECT COUNT(*) as total FROM system_config`);
    const configsPreserved = configCount[0]?.total || 0;

    console.log('✅ Limpeza concluída!');
    console.log(`📊 Total de registros deletados: ${totalDeleted}`);
    console.log(`⚙️ Configurações preservadas: ${configsPreserved}`);

    return NextResponse.json({
      success: true,
      message: 'Limpeza concluída com sucesso!',
      data: {
        totalDeleted,
        configsPreserved,
        beforeCounts,
        afterCounts,
        results
      }
    });

  } catch (error: any) {
    console.error('❌ Erro durante a limpeza:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor durante a limpeza',
      error: error.message
    }, { status: 500 });
  }
}

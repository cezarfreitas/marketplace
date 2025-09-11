import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { importService } from '@/lib/import-service';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    // Buscar estatísticas gerais de importação
    const importStats = await importService.getImportStats();
    const importHistory = await importService.getImportHistory(20);
    
    // Buscar estatísticas do banco de dados
    const dbStats = await executeQuery(`
      SELECT 
        'products' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_records,
        COUNT(CASE WHEN is_visible = 1 THEN 1 END) as visible_records
      FROM products_vtex
      UNION ALL
      SELECT 
        'categories' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_records,
        0 as visible_records
      FROM categories
      UNION ALL
      SELECT 
        'brands' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_records,
        0 as visible_records
      FROM brands
      UNION ALL
      SELECT 
        'skus' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_records,
        0 as visible_records
      FROM skus_vtex
    `);
    
    // Buscar última importação de cada tipo (se a tabela existir)
    let lastImports = [];
    try {
      lastImports = await executeQuery(`
        SELECT 
          import_type,
          status,
          total_items,
          processed_items,
          failed_items,
          started_at,
          completed_at,
          created_at
        FROM import_logs 
        WHERE id IN (
          SELECT MAX(id) 
          FROM import_logs 
          GROUP BY import_type
        )
        ORDER BY import_type
      `);
    } catch (error) {
      console.log('⚠️ Tabela import_logs não encontrada, usando dados vazios');
      lastImports = [];
    }
    
    // Calcular estatísticas de sucesso
    const successRates = importStats.map((stat: any) => ({
      import_type: stat.import_type,
      status: stat.status,
      success_rate: stat.total_items > 0 ? 
        ((stat.processed_items / stat.total_items) * 100).toFixed(2) : 0
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        import_stats: importStats,
        import_history: importHistory,
        database_stats: dbStats,
        last_imports: lastImports,
        success_rates: successRates
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

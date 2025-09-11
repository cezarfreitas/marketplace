import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Iniciando limpeza completa de todos os dados...');

    // Lista de tabelas para limpar (em ordem de dependência)
    const tablesToClear = [
      // Tabelas dependentes primeiro
      'respostas_caracteristicas',
      'caracteristicas_categorias', 
      'marketplace',
      'anymarket_sync',
      'stock_vtex',
      'images_vtex',
      'skus_vtex',
      'products_vtex',
      'brands_vtex',
      'categories_vtex',
      'caracteristicas'
    ];

    const results: { table: string; deletedRows: number; success: boolean; error?: string }[] = [];

    // Limpar cada tabela
    for (const table of tablesToClear) {
      try {
        console.log(`🧹 Limpando tabela: ${table}`);
        
        // Verificar se a tabela existe
        const tableExists = await executeQuery(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = ?
        `, [table]);

        if (tableExists[0].count === 0) {
          console.log(`⚠️ Tabela ${table} não existe, pulando...`);
          results.push({
            table,
            deletedRows: 0,
            success: true
          });
          continue;
        }

        // Contar registros antes da limpeza
        const countResult = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
        const beforeCount = countResult[0].count;

        // Limpar a tabela
        await executeQuery(`DELETE FROM ${table}`);

        // Resetar auto_increment se existir
        try {
          await executeQuery(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        } catch (error) {
          // Ignorar erro se a tabela não tiver auto_increment
          console.log(`ℹ️ Tabela ${table} não possui auto_increment`);
        }

        console.log(`✅ Tabela ${table} limpa: ${beforeCount} registros removidos`);
        
        results.push({
          table,
          deletedRows: beforeCount,
          success: true
        });

      } catch (error: any) {
        console.error(`❌ Erro ao limpar tabela ${table}:`, error.message);
        results.push({
          table,
          deletedRows: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Calcular estatísticas
    const totalDeleted = results.reduce((sum, result) => sum + result.deletedRows, 0);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`\n🎉 LIMPEZA CONCLUÍDA!`);
    console.log(`📊 Total de registros removidos: ${totalDeleted}`);
    console.log(`✅ Tabelas limpas com sucesso: ${successCount}`);
    console.log(`❌ Tabelas com erro: ${errorCount}`);

    // Log detalhado dos resultados
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.table}: ${result.deletedRows} registros removidos`);
      } else {
        console.log(`❌ ${result.table}: ERRO - ${result.error}`);
      }
    });

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída! ${totalDeleted} registros removidos de ${successCount} tabelas.`,
      data: {
        totalDeleted,
        successCount,
        errorCount,
        results
      }
    });

  } catch (error: any) {
    console.error('❌ Erro crítico durante limpeza:', error);
    return NextResponse.json({
      success: false,
      message: `Erro crítico durante limpeza: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
}

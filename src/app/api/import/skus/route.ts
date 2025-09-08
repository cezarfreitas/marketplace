import { NextRequest, NextResponse } from 'next/server';
import { importService } from '@/lib/import-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando importação de SKUs via API...');
    
    const body = await request.json();
    const batchSize = body.batchSize || 50;
    
    const result = await importService.importSkus(batchSize);
    
    return NextResponse.json({
      success: true,
      message: 'Importação de SKUs iniciada com sucesso',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Erro na importação de SKUs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao importar SKUs',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await importService.getImportStats();
    const history = await importService.getImportHistory(10);
    
    return NextResponse.json({
      success: true,
      data: {
        stats: stats.filter((stat: any) => stat.import_type === 'skus'),
        history: history.filter((log: any) => log.import_type === 'skus')
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de SKUs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

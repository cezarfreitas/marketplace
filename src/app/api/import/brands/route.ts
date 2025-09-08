import { NextRequest, NextResponse } from 'next/server';
import { importService } from '@/lib/import-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando importação de marcas via API...');
    
    const result = await importService.importBrands();
    
    return NextResponse.json({
      success: true,
      message: 'Importação de marcas iniciada com sucesso',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Erro na importação de marcas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao importar marcas',
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
        stats: stats.filter((stat: any) => stat.import_type === 'brands'),
        history: history.filter((log: any) => log.import_type === 'brands')
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de marcas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

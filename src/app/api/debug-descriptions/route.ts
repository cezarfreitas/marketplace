import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Debugando tabela descriptions...');

    // Verificar se a tabela existe
    const [tables] = await executeQuery('SHOW TABLES LIKE "descriptions"');
    
    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela descriptions não existe'
      });
    }

    // Verificar estrutura da tabela
    const [columns] = await executeQuery('DESCRIBE descriptions');
    console.log('📋 Estrutura da tabela descriptions:', columns);

    // Verificar todos os registros
    const [allRecords] = await executeQuery('SELECT * FROM descriptions LIMIT 10');
    console.log('📊 Registros na tabela:', allRecords);

    // Testar busca por status
    const [statusRecords] = await executeQuery('SELECT * FROM descriptions WHERE status = "generated" LIMIT 10');
    console.log('📊 Registros com status generated:', statusRecords);

    // Testar busca por status diferente
    const [allStatusRecords] = await executeQuery('SELECT * FROM descriptions WHERE status IS NOT NULL LIMIT 10');
    console.log('📊 Registros com status não nulo:', allStatusRecords);

    return NextResponse.json({
      success: true,
      data: {
        tableExists: tables.length > 0,
        columns: columns,
        allRecords: allRecords,
        statusRecords: statusRecords,
        allStatusRecords: allStatusRecords,
        recordCount: allRecords.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao debugar tabela descriptions:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao debugar tabela descriptions',
      error: error.message
    }, { status: 500 });
  }
}

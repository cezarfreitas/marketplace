import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function POST(request: NextRequest) {
  try {
    // Verificar ambiente de build
    const isBuildTime = checkBuildEnvironment();
    if (isBuildTime) {
      return NextResponse.json({ 
        success: false, 
        message: 'API não disponível durante build' 
      }, { status: 503 });
    }

    const { query, params = [] } = await request.json();

    if (!query) {
      return NextResponse.json({
        success: false,
        message: 'Query é obrigatória'
      }, { status: 400 });
    }

    console.log('🔍 Executando query:', query);
    console.log('📋 Parâmetros:', params);

    const result = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Erro ao executar query:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar query',
      error: error.message
    }, { status: 500 });
  }
}

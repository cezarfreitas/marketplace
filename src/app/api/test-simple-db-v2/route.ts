import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-simple';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando executeQuery simplificado...');

    // Teste 1: SELECT simples
    console.log('📊 Testando SELECT...');
    const [selectResult] = await executeQuery('SELECT 1 as test');
    console.log('✅ SELECT OK:', selectResult);

    return NextResponse.json({
      success: true,
      message: 'Teste de executeQuery simplificado OK!',
      data: {
        select: selectResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de executeQuery simplificado:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste de executeQuery simplificado',
      error: error.message
    }, { status: 400 });
  }
}

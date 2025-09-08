import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Teste básico da API...');
    
    return NextResponse.json({
      success: true,
      message: 'Teste básico OK!',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no teste básico:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste básico',
      error: error.message
    }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Teste simples funcionando...');
    
    return NextResponse.json({
      success: true,
      message: 'Teste simples OK!',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no teste simples:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste simples',
      error: error.message
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Debug test - recebendo requisição...');
    
    const body = await request.json();
    console.log('📦 Body recebido:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Debug test OK!',
      receivedData: body,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no debug test:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no debug test',
      error: error.message
    }, { status: 400 });
  }
}

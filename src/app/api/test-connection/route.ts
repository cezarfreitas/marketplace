import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/database';

export async function GET() {
  try {
    console.log('🧪 Testando conexão com banco de dados...');
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Conexão com banco OK!'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Erro na conexão com banco'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Erro no teste de conexão:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste de conexão',
      error: error.message
    }, { status: 500 });
  }
}

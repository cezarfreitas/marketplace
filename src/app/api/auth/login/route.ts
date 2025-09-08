import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validar dados de entrada
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Username e senha são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔐 Tentativa de login para usuário:', username);

    // Fazer login
    const authResult = await login({ username, password });

    if (authResult) {
      console.log('✅ Login realizado com sucesso para:', username);
      
      return NextResponse.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token: authResult.token,
          user: authResult.user
        }
      });
    } else {
      console.log('❌ Falha no login para:', username);
      
      return NextResponse.json({
        success: false,
        message: 'Credenciais inválidas'
      }, { status: 401 });
    }

  } catch (error: any) {
    console.error('❌ Erro no login:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha, username, password } = body;

    // Suporte tanto para email/senha quanto username/password (compatibilidade)
    const loginEmail = email || username;
    const loginSenha = senha || password;

    // Validar dados de entrada
    if (!loginEmail || !loginSenha) {
      return NextResponse.json({
        success: false,
        message: 'Email e senha são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔐 Tentativa de login para usuário:', loginEmail);

    // Fazer login
    const authResult = await login({ email: loginEmail, senha: loginSenha });

    if (authResult) {
      console.log('✅ Login realizado com sucesso para:', loginEmail);
      
      return NextResponse.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token: authResult.token,
          user: authResult.user
        }
      });
    } else {
      console.log('❌ Falha no login para:', loginEmail);
      
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

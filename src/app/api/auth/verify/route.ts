import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Validar token
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token é obrigatório'
      }, { status: 400 });
    }

    console.log('🔍 Verificando token...');

    // Verificar token
    const decoded = verifyToken(token);
    
    if (decoded) {
      // Buscar dados atualizados do usuário
      const user = await getUserById(decoded.userId);
      
      if (user && user.is_active) {
        console.log('✅ Token válido para usuário:', user.nome);
        
        return NextResponse.json({
          success: true,
          message: 'Token válido',
          data: {
            user: user
          }
        });
      } else {
        console.log('❌ Usuário inativo ou não encontrado');
        
        return NextResponse.json({
          success: false,
          message: 'Usuário inativo ou não encontrado'
        }, { status: 401 });
      }
    } else {
      console.log('❌ Token inválido');
      
      return NextResponse.json({
        success: false,
        message: 'Token inválido ou expirado'
      }, { status: 401 });
    }

  } catch (error: any) {
    console.error('❌ Erro na verificação do token:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout solicitado');

    // Em um sistema mais robusto, aqui poderíamos:
    // 1. Invalidar o token no banco de dados
    // 2. Adicionar o token a uma blacklist
    // 3. Registrar o logout no log de auditoria
    
    // Por enquanto, apenas retornamos sucesso
    // O cliente deve remover o token do localStorage
    
    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro no logout:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}

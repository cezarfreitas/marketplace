import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Função para mascarar tokens e senhas
    const maskSensitiveValue = (value: string | undefined): string => {
      if (!value) return 'Não configurado';
      
      // Se for muito curto, mostra apenas os primeiros 2 caracteres
      if (value.length <= 4) {
        return value.substring(0, 2) + '*'.repeat(value.length - 2);
      }
      
      // Para valores maiores, mostra os primeiros 4 e últimos 4 caracteres
      const start = value.substring(0, 4);
      const end = value.substring(value.length - 4);
      const middle = '*'.repeat(Math.max(4, value.length - 8));
      
      return `${start}${middle}${end}`;
    };

    // Função para determinar se um valor é sensível
    const isSensitiveKey = (key: string): boolean => {
      const sensitiveKeys = [
        'password', 'pass', 'pwd',
        'token', 'key', 'secret',
        'auth', 'credential',
        'api_key', 'apikey',
        'access_token', 'refresh_token',
        'private_key', 'public_key'
      ];
      
      return sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase())
      );
    };

    // Coletar todas as variáveis de ambiente
    const envConfig = {
      // Configurações do Banco de Dados
      database: {
        host: process.env.DB_HOST || 'Não configurado',
        port: process.env.DB_PORT || 'Não configurado',
        name: process.env.DB_NAME || 'Não configurado',
        user: process.env.DB_USER || 'Não configurado',
        password: maskSensitiveValue(process.env.DB_PASSWORD),
      },
      
      // Configurações VTEX
      vtex: {
        accountName: process.env.VTEX_ACCOUNT_NAME || 'Não configurado',
        environment: process.env.VTEX_ENVIRONMENT || 'Não configurado',
        appKey: maskSensitiveValue(process.env.VTEX_APP_KEY),
        appToken: maskSensitiveValue(process.env.VTEX_APP_TOKEN),
      },
      
      // Configurações OpenAI
      openai: {
        apiKey: maskSensitiveValue(process.env.OPENAI_API_KEY),
        organization: process.env.OPENAI_ORGANIZATION || 'Não configurado',
      },
      
      // Configurações Anymarket
      anymarket: {
        token: maskSensitiveValue(process.env.ANYMARKET_TOKEN),
        apiUrl: process.env.ANYMARKET_API_URL || 'Não configurado',
      },
      
      // Configurações do Sistema
      system: {
        nodeEnv: process.env.NODE_ENV || 'Não configurado',
        nextAuthSecret: maskSensitiveValue(process.env.NEXTAUTH_SECRET),
        nextAuthUrl: process.env.NEXTAUTH_URL || 'Não configurado',
      },
      
      // Outras configurações sensíveis
      other: Object.keys(process.env)
        .filter(key => isSensitiveKey(key) && !key.includes('DB_') && !key.includes('VTEX_') && !key.includes('OPENAI_') && !key.includes('ANYMARKET_') && !key.includes('NEXTAUTH_'))
        .reduce((acc, key) => {
          acc[key] = maskSensitiveValue(process.env[key]);
          return acc;
        }, {} as Record<string, string>)
    };

    console.log('✅ Configurações do .env obtidas com sucesso');

    return NextResponse.json({
      success: true,
      data: envConfig
    });

  } catch (error: any) {
    console.error('❌ Erro ao obter configurações do .env:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao obter configurações',
      error: error.message
    }, { status: 500 });
  }
}

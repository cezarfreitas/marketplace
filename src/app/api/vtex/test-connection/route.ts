import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface VtexConfig {
  accountName: string;
  environment: string;
  appKey: string;
  appToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const config: VtexConfig = await request.json();
    
    if (!config.accountName || !config.appKey || !config.appToken) {
      return NextResponse.json({
        success: false,
        message: 'Configurações incompletas. Preencha todos os campos obrigatórios.'
      }, { status: 400 });
    }

    // Testar conexão com a API VTEX
    const baseURL = `https://${config.accountName}.${config.environment}.com.br`;
    const testEndpoint = '/api/catalog_system/pvt/brand/list';
    
    const response = await axios.get(`${baseURL}${testEndpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VTEX-API-AppKey': config.appKey,
        'X-VTEX-API-AppToken': config.appToken,
      },
      timeout: 10000, // 10 segundos
    });

    if (response.status === 200) {
      return NextResponse.json({
        success: true,
        message: `Conexão estabelecida com sucesso! Encontradas ${response.data.length} marcas.`,
        data: {
          status: response.status,
          brandsCount: response.data.length,
          baseURL
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Erro na API VTEX: Status ${response.status}`
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('Erro ao testar conexão VTEX:', error);
    
    let errorMessage = 'Erro desconhecido ao conectar com VTEX';
    
    if (error.response) {
      // Erro de resposta da API
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMessage = 'Credenciais inválidas. Verifique App Key e App Token.';
          break;
        case 403:
          errorMessage = 'Acesso negado. Verifique as permissões da sua API key.';
          break;
        case 404:
          errorMessage = 'Conta VTEX não encontrada. Verifique o nome da conta.';
          break;
        case 429:
          errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
          break;
        default:
          errorMessage = `Erro da API VTEX: ${status} - ${error.response.data?.message || 'Erro desconhecido'}`;
      }
    } else if (error.request) {
      // Erro de rede
      errorMessage = 'Erro de conexão. Verifique sua internet e as configurações.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Timeout na conexão. A API VTEX pode estar lenta.';
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { VTEXService } from '@/lib/vtex-service';
import { StockImportService } from '@/lib/stock-import-service';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { skuIds, importAll = false } = await request.json();

    // Usar configurações da VTEX das variáveis de ambiente
    const config = {
      vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
      vtex_environment: process.env.VTEX_ENVIRONMENT,
      vtex_app_key: process.env.VTEX_APP_KEY,
      vtex_app_token: process.env.VTEX_APP_TOKEN,
    };

    if (!config.vtex_account_name || !config.vtex_environment || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações da VTEX não encontradas nas variáveis de ambiente.'
      }, { status: 400 });
    }

    // Criar instância do serviço VTEX
    const vtexService = new VTEXService({
      accountName: config.vtex_account_name,
      environment: config.vtex_environment,
      appKey: config.vtex_app_key,
      appToken: config.vtex_app_token,
    });

    // Criar instância do serviço de importação de estoque
    const stockImportService = new StockImportService(vtexService);

    let result;

    if (importAll) {
      console.log('🚀 Iniciando importação de estoque para todos os SKUs...');
      result = await stockImportService.importStockForAllSkus();
    } else if (skuIds && Array.isArray(skuIds) && skuIds.length > 0) {
      console.log(`🚀 Iniciando importação de estoque para ${skuIds.length} SKUs...`);
      result = await stockImportService.importStockForSkus(skuIds);
    } else {
      return NextResponse.json({
        success: false,
        message: 'É necessário fornecer skuIds ou definir importAll como true'
      }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Erro na API de importação de estoque:', error);
    return NextResponse.json({
      success: false,
      message: `Erro interno: ${error.message}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skuId = searchParams.get('skuId');

    if (!skuId) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro skuId é obrigatório'
      }, { status: 400 });
    }

    // Usar configurações da VTEX das variáveis de ambiente
    const config = {
      vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
      vtex_environment: process.env.VTEX_ENVIRONMENT,
      vtex_app_key: process.env.VTEX_APP_KEY,
      vtex_app_token: process.env.VTEX_APP_TOKEN,
    };

    if (!config.vtex_account_name || !config.vtex_environment || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações da VTEX não encontradas nas variáveis de ambiente.'
      }, { status: 400 });
    }

    // Criar instância do serviço VTEX
    const vtexService = new VTEXService({
      accountName: config.vtex_account_name,
      environment: config.vtex_environment,
      appKey: config.vtex_app_key,
      appToken: config.vtex_app_token,
    });

    // Buscar estoque do SKU
    const stockData = await vtexService.getSKUStock(parseInt(skuId));

    if (!stockData) {
      return NextResponse.json({
        success: false,
        message: `Nenhum estoque encontrado para SKU ${skuId}`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: stockData
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar estoque:', error);
    return NextResponse.json({
      success: false,
      message: `Erro interno: ${error.message}`
    }, { status: 500 });
  }
}

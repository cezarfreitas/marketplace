import { NextRequest, NextResponse } from 'next/server';
import { BatchImportModule } from '@/lib/import-modules/batch-import';
import { progressStore } from '@/lib/progress-store';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API de importação em lote chamada');

    const body = await request.json();
    const { refIds, config } = body;

    console.log('Dados recebidos:', { refIds, config });

    // Validar entrada
    if (!refIds || !Array.isArray(refIds) || refIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de RefIds é obrigatória e deve ser um array não vazio' },
        { status: 400 }
      );
    }

    // Configuração padrão se não fornecida
    const importConfig = {
      importProduct: true,
      importBrand: true,
      importCategory: true,
      importSkus: true,
      importImages: true,
      importStock: true,
      skipExisting: false,
      ...config
    };

    console.log('Configuração de importação:', importConfig);

    // Configurações da VTEX
    const vtexConfig = {
      vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
      vtex_environment: process.env.VTEX_ENVIRONMENT,
      vtex_app_key: process.env.VTEX_APP_KEY,
      vtex_app_token: process.env.VTEX_APP_TOKEN,
    };

    if (!vtexConfig.vtex_account_name || !vtexConfig.vtex_environment || 
        !vtexConfig.vtex_app_key || !vtexConfig.vtex_app_token) {
      return NextResponse.json(
        { error: 'Configurações da VTEX não encontradas nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const baseUrl = `https://${vtexConfig.vtex_account_name}.${vtexConfig.vtex_environment}.com.br`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-VTEX-API-AppKey': vtexConfig.vtex_app_key,
      'X-VTEX-API-AppToken': vtexConfig.vtex_app_token,
    };

    // Criar ID de progresso
    const progressId = `batch_${Date.now()}`;
    
    // Inicializar progresso
    progressStore.createProgress(progressId, refIds.length);
    progressStore.updateProgress(progressId, 'running', 0, 'Iniciando importação...');

    // Retornar imediatamente com o progressId
    const response = NextResponse.json({
      success: true,
      message: 'Importação iniciada',
      data: {
        progressId,
        totalProducts: refIds.length
      }
    });

    // Executar importação em background
    executeImportInBackground(progressId, refIds, importConfig, baseUrl, headers);

    return response;

  } catch (error: any) {
    console.error('❌ Erro na importação em lote:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor na importação em lote',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Função para executar importação em background
async function executeImportInBackground(
  progressId: string,
  refIds: string[],
  config: any,
  baseUrl: string,
  headers: Record<string, string>
) {
  try {
    const batchImporter = new BatchImportModule(baseUrl, headers);
    const results: any[] = [];

    for (let i = 0; i < refIds.length; i++) {
      const refId = refIds[i];
      
      // Atualizar progresso
      progressStore.updateProgress(
        progressId, 
        'running', 
        Math.round((i / refIds.length) * 100),
        `Importando produto ${i + 1}/${refIds.length}: ${refId}`,
        refId
      );

      try {
        // Importar produto individual
        const result = await batchImporter.importProductByRefId(refId, config);
        results.push(result);
        progressStore.addResult(progressId, result);

        if (result.success) {
          progressStore.incrementProgress(
            progressId,
            `Produto ${refId} importado com sucesso`,
            refId
          );
        } else {
          progressStore.addError(progressId, `Erro ao importar ${refId}: ${result.message}`);
        }
      } catch (error: any) {
        const errorMsg = `Erro ao importar ${refId}: ${error.message}`;
        progressStore.addError(progressId, errorMsg);
        results.push({
          refId,
          success: false,
          message: errorMsg
        });
      }
    }

    // Finalizar progresso
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    progressStore.updateProgress(
      progressId,
      'completed',
      100,
      `Importação concluída: ${successCount} sucessos, ${errorCount} falhas`
    );

  } catch (error: any) {
    progressStore.updateProgress(
      progressId,
      'error',
      0,
      `Erro crítico: ${error.message}`
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const progressId = searchParams.get('progressId');

  // Se há um progressId, retornar status do progresso
  if (progressId) {
    const progress = progressStore.getProgress(progressId);
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Progresso não encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        progressId: progress.id,
        status: progress.status,
        progress: progress.progress,
        message: progress.message,
        currentItem: progress.currentItem,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
        results: progress.results,
        errors: progress.errors,
        startTime: progress.startTime,
        endTime: progress.endTime
      }
    });
  }

  // Se não há progressId, retornar documentação da API
  return NextResponse.json({
    message: 'API de importação em lote da VTEX',
    status: 'ready'
  });
}
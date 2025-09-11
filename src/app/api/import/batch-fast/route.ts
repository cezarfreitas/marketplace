import { NextRequest, NextResponse } from 'next/server';
import { FastBatchImportModule } from '@/lib/import-modules/fast-batch-import';
import { progressStore } from '@/lib/progress-store';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🚀 API de importação em lote RÁPIDA chamada');

    const body = await request.json();
    const { refIds, config, batchSize = 20 } = body;

    console.log('Dados recebidos:', { refIds, config, batchSize });

    // Validar entrada
    if (!refIds || !Array.isArray(refIds) || refIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de RefIds é obrigatória e deve ser um array não vazio' },
        { status: 400 }
      );
    }

    // Limitar batch size para processamento otimizado
    const maxBatchSize = Math.min(batchSize, 10); // Ajustado para 10

    // Configuração padrão otimizada
    const importConfig = {
      importProduct: true,
      importBrand: true,
      importCategory: true,
      importSkus: true,
      importImages: true,
      importStock: true,
      importAttributes: true, // Importar atributos do produto
      skipExisting: true, // Pular existentes para ser mais rápido
      parallelProcessing: true, // Ativar processamento paralelo
      ...config
    };

    console.log('Configuração de importação otimizada:', importConfig);

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
    const progressId = `batch_fast_${Date.now()}`;
    
    // Inicializar progresso
    progressStore.createProgress(progressId, refIds.length);
    progressStore.updateProgress(progressId, 'running', 0, 'Iniciando importação rápida...');

    // Retornar imediatamente com o progressId
    const response = NextResponse.json({
      success: true,
      message: 'Importação rápida iniciada',
      data: {
        progressId,
        totalProducts: refIds.length,
        batchSize: maxBatchSize,
        estimatedTime: `${Math.ceil(refIds.length / maxBatchSize) * 2} minutos`
      }
    });

    // Executar importação em background com processamento paralelo
    executeFastImportInBackground(progressId, refIds, importConfig, baseUrl, headers, maxBatchSize);

    return response;

  } catch (error: any) {
    console.error('❌ Erro na importação em lote rápida:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor na importação em lote rápida',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Função para executar importação rápida em background com processamento paralelo
async function executeFastImportInBackground(
  progressId: string,
  refIds: string[],
  config: any,
  baseUrl: string,
  headers: Record<string, string>,
  batchSize: number
) {
  try {
    const fastImporter = new FastBatchImportModule(baseUrl, headers);
    const startTime = Date.now();

    console.log(`🚀 Processando ${refIds.length} produtos com importação rápida`);

    // Atualizar progresso inicial
    progressStore.updateProgress(
      progressId, 
      'running', 
      0,
      `Iniciando importação rápida de ${refIds.length} produtos...`
    );

    // Executar importação rápida usando o FastBatchImportModule
    const results = await fastImporter.importMultipleProductsFast(refIds, {
      ...config,
      batchSize
    });

    // Processar resultados e atualizar progresso
    results.forEach((result, index) => {
      progressStore.addResult(progressId, result);
      
      if (result.success) {
        progressStore.incrementProgress(
          progressId,
          `Produto ${result.data?.refId} importado com sucesso`,
          result.data?.refId
        );
      } else {
        progressStore.addError(progressId, `Erro ao importar ${result.data?.refId}: ${result.message}`);
      }
    });

    // Finalizar progresso
    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`\n🎉 IMPORTAÇÃO RÁPIDA CONCLUÍDA!`);
    console.log(`⏱️ Tempo total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Falhas: ${errorCount}`);
    console.log(`📊 Taxa de sucesso: ${((successCount / refIds.length) * 100).toFixed(1)}%`);
    
    progressStore.updateProgress(
      progressId,
      'completed',
      100,
      `Importação rápida concluída em ${(totalTime / 1000).toFixed(2)}s: ${successCount} sucessos, ${errorCount} falhas`
    );

  } catch (error: any) {
    console.error('❌ Erro crítico na importação rápida:', error);
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

  if (!progressId) {
    return NextResponse.json(
      { error: 'progressId é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const progress = progressStore.getProgress(progressId);
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Progresso não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar progresso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

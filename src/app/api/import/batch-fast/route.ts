import { NextRequest, NextResponse } from 'next/server';
import { FastBatchImportModule } from '@/lib/import-modules/fast-batch-import';
import { progressStore } from '@/lib/progress-store';
import { checkBuildEnvironment } from '@/lib/build-check';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    // Verificar rate limit (200 requisições por minuto)
    const rateLimitCheck = checkRateLimit(request);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit excedido',
          message: 'Máximo de 200 requisições por minuto. Aguarde antes de tentar novamente.',
          retryAfter: 60
        },
        { 
          status: 429,
          headers: {
            ...rateLimitCheck.headers,
            'Retry-After': '60'
          }
        }
      );
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

    // Validar limite máximo de produtos
    if (refIds.length > 200) {
      return NextResponse.json(
        { error: 'Máximo de 200 produtos por importação. Use múltiplas chamadas para mais produtos. Você enviou ' + refIds.length + ' produtos.' },
        { status: 400 }
      );
    }

    // Limitar batch size para processamento otimizado
    const maxBatchSize = Math.min(batchSize, 20); // Aumentado para 20

    // Configuração padrão otimizada
    const importConfig = {
      importProduct: true,
      importBrand: true,
      importCategory: true,
      importSkus: true,
      importImages: true,
      importStock: true,
      importAttributes: true, // Importar atributos do produto
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
    console.log('🔄 Criando progresso para ID:', progressId, 'com', refIds.length, 'produtos');
    progressStore.createProgress(progressId, refIds.length);
    progressStore.updateProgress(progressId, 'running', 0, 'Iniciando importação...');
    
    // Verificar se foi criado corretamente
    const createdProgress = progressStore.getProgress(progressId);
    console.log('✅ Progresso criado:', {
      id: createdProgress?.id,
      status: createdProgress?.status,
      totalItems: createdProgress?.totalItems
    });
    
    // Atualizar com mensagem de contagem
    progressStore.updateProgress(progressId, 'running', 0, 'Contando produtos e SKUs...');

    // Retornar imediatamente com o progressId
    const response = NextResponse.json({
      success: true,
      message: 'Importação rápida iniciada',
      data: {
        progressId,
        totalProducts: refIds.length,
        batchSize: maxBatchSize
      }
    }, {
      headers: rateLimitCheck.headers
    });

    // Executar importação em background com processamento paralelo
    executeFastImportInBackground(progressId, refIds, importConfig, baseUrl, headers, maxBatchSize);

    // Log para debug
    console.log('🚀 Importação iniciada com progressId:', progressId);
    console.log('📊 Configuração:', importConfig);

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

    // Inicializar progresso sem mensagem inicial
    progressStore.updateProgress(
      progressId, 
      'running', 
      0,
      ''
    );

    // Executar importação rápida usando o FastBatchImportModule
    const results = await fastImporter.importMultipleProductsFast(refIds, {
      ...config,
      batchSize
    }, (current: number, total: number, currentItem?: string) => {
      // Atualizar progresso em tempo real - apenas mensagens de SKU
      const progress = Math.round((current / total) * 100);
      let message = '';
      
      if (currentItem && currentItem.includes('Processando SKU')) {
        message = currentItem;
      }
      
      progressStore.updateProgress(
        progressId,
        'running',
        progress,
        message,
        undefined,
        total,
        current
      );
    });

    // Processar resultados e atualizar progresso
    console.log('📊 Processando resultados:', results.length);
    
    results.forEach((result, index) => {
      console.log(`📦 Processando resultado ${index + 1}:`, {
        refId: result.refId,
        success: result.success,
        message: result.message
      });
      
      progressStore.addResult(progressId, result);
      
      if (result.success) {
        progressStore.incrementProgress(
          progressId,
          `Produto ${result.refId} importado com sucesso`,
          result.refId
        );
      } else {
        progressStore.addError(progressId, `Erro ao importar ${result.refId}: ${result.message}`);
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
  // Verificar rate limit (200 requisições por minuto)
  const rateLimitCheck = checkRateLimit(request);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit excedido',
        message: 'Máximo de 200 requisições por minuto. Aguarde antes de tentar novamente.',
        retryAfter: 60
      },
      { 
        status: 429,
        headers: {
          ...rateLimitCheck.headers,
          'Retry-After': '60'
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const progressId = searchParams.get('progressId');

  console.log('🔍 GET /api/import/batch-fast - progressId:', progressId);

  if (!progressId) {
    console.log('❌ progressId não fornecido');
    return NextResponse.json(
      { error: 'progressId é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const progress = progressStore.getProgress(progressId);
    
    console.log('📊 Progresso encontrado:', {
      id: progress?.id,
      status: progress?.status,
      progress: progress?.progress,
      message: progress?.message,
      totalItems: progress?.totalItems,
      completedItems: progress?.completedItems
    });
    
    if (!progress) {
      console.log('❌ Progresso não encontrado para ID:', progressId);
      return NextResponse.json(
        { error: 'Progresso não encontrado' },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      data: progress
    };

    console.log('✅ Retornando progresso:', response);
    return NextResponse.json(response, {
      headers: rateLimitCheck.headers
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar progresso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

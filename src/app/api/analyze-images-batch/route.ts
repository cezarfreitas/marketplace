import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

interface BatchAnalysisResult {
  productId: number;
  productName: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
}

interface BatchAnalysisResponse {
  success: boolean;
  message: string;
  data?: {
    total: number;
    success: number;
    errors: number;
    results: BatchAnalysisResult[];
    totalTime: number;
  };
}

// Função para executar análise de imagem de um produto
async function executeImageAnalysis(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`🖼️ Executando análise de imagem para produto ${productId}...`);
    
    // Buscar categoria do produto primeiro
    const productQuery = `SELECT id_category_vtex FROM products_vtex WHERE id_produto_vtex = ?`;
    const productResult = await executeQuery(productQuery, [productId]);
    
    if (!productResult || productResult.length === 0) {
      return { success: false, error: 'Produto não encontrado' };
    }
    
    const categoryVtexId = productResult[0].id_category_vtex;
    if (!categoryVtexId) {
      return { success: false, error: 'Produto não possui categoria definida' };
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://b2b-seo.jzo3qo.easypanel.host' : 'http://127.0.0.1:3000');
    const response = await fetch(`${baseUrl}/api/analyze-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productId, 
        categoryVtexId,
        forceNewAnalysis: true 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro na análise de imagem' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Análise de imagem concluída com sucesso' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<BatchAnalysisResponse>> {
  try {
    // Verificar ambiente de build
    const isBuildTime = checkBuildEnvironment();
    if (isBuildTime) {
      return NextResponse.json({ 
        success: false, 
        message: 'API não disponível durante build' 
      }, { status: 503 });
    }

    const { productIds, skipExisting = false } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de IDs de produtos é obrigatória'
      }, { status: 400 });
    }

    console.log(`🚀 Iniciando análise de imagens em lote para ${productIds.length} produtos`);
    console.log(`📋 Configuração: skipExisting = ${skipExisting}`);

    const startTime = Date.now();
    const results: BatchAnalysisResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Inicializar resultados com status "pendente"
    for (const productId of productIds) {
      let productName = `Produto ${productId}`;
      try {
        const productQuery = `SELECT name FROM products_vtex WHERE id_produto_vtex = ?`;
        const productResult = await executeQuery(productQuery, [productId]);
        if (productResult && productResult.length > 0) {
          productName = productResult[0].name || productName;
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar nome do produto ${productId}:`, error);
      }

      results.push({
        productId,
        productName,
        success: false,
        message: 'Aguardando processamento...'
      });
    }

    // Processar cada produto sequencialmente (não em paralelo)
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const productStartTime = Date.now();
      
      console.log(`\n📦 Processando produto ${i + 1}/${productIds.length}: ${productId}`);
      
      // Atualizar status para "processando"
      results[i].message = 'Executando análise de imagem...';

      try {
        // Executar análise de imagem
        const analysisResult = await executeImageAnalysis(productId);
        
        if (analysisResult.success) {
          results[i].success = true;
          results[i].message = analysisResult.message || 'Análise de imagem concluída com sucesso';
          successCount++;
        } else {
          results[i].success = false;
          results[i].error = analysisResult.error;
          results[i].message = `Erro na análise: ${analysisResult.error}`;
          errorCount++;
        }

        results[i].duration = Date.now() - productStartTime;
        console.log(`✅ Produto ${productId} processado em ${results[i].duration}ms: ${results[i].message}`);

      } catch (error: any) {
        console.error(`❌ Erro ao processar produto ${productId}:`, error);
        
        results[i].success = false;
        results[i].error = error.message;
        results[i].message = `Erro crítico: ${error.message}`;
        results[i].duration = Date.now() - productStartTime;
        errorCount++;
      }

      // Pequena pausa entre produtos para evitar sobrecarga
      if (i < productIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Análise de imagens em lote concluída em ${totalTime}ms: ${successCount} sucessos, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      message: `Análise de imagens em lote concluída: ${successCount} sucessos, ${errorCount} erros`,
      data: {
        total: productIds.length,
        success: successCount,
        errors: errorCount,
        results,
        totalTime
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na análise de imagens em lote:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor na análise de imagens em lote',
      error: error.message
    }, { status: 500 });
  }
}

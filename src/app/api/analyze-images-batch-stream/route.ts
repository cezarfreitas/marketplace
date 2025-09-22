import { NextRequest } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

interface BatchAnalysisResult {
  productId: number;
  productName: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
  steps: {
    imageAnalysis: { success: boolean; message: string; error?: string; duration?: number };
    titleGeneration: { success: boolean; message: string; error?: string; duration?: number };
    descriptionGeneration: { success: boolean; message: string; error?: string; duration?: number };
    characteristicsGeneration: { success: boolean; message: string; error?: string; duration?: number };
    anymarketSync: { success: boolean; message: string; error?: string; duration?: number };
    imageCrop: { success: boolean; message: string; error?: string; duration?: number };
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-images`, {
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

// Função para gerar título de um produto
async function executeTitleGeneration(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`📝 Executando geração de título para produto ${productId}...`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productId,
        forceNewGeneration: true 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro na geração de título' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Título gerado com sucesso' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Função para gerar descrição de um produto
async function executeDescriptionGeneration(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`📄 Executando geração de descrição para produto ${productId}...`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productId,
        forceNewGeneration: true 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro na geração de descrição' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Descrição gerada com sucesso' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Função para gerar características de um produto
async function executeCharacteristicsGeneration(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`🏷️ Executando geração de características para produto ${productId}...`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-characteristics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productId,
        forceNewGeneration: true 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro na geração de características' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Características geradas com sucesso' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Função para sincronizar produto com AnyMarket
async function executeAnymarketSync(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`🔄 Executando sincronização AnyMarket para produto ${productId}...`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/anymarket/sync-put`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro na sincronização AnyMarket' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Sincronização AnyMarket concluída' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Função para executar crop de imagens de um produto
async function executeImageCrop(productId: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log(`✂️ Executando crop de imagens para produto ${productId}...`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crop-images-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productIds: [productId]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Erro no crop de imagens' };
    }

    const result = await response.json();
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      message: result.success ? 'Crop de imagens concluído' : result.message
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar ambiente de build
    const isBuildTime = checkBuildEnvironment();
    if (isBuildTime) {
      return new Response('API não disponível durante build', { status: 503 });
    }

    const { productIds, skipExisting = false } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response('Lista de IDs de produtos é obrigatória', { status: 400 });
    }

    console.log(`🚀 Iniciando análise de imagens em lote para ${productIds.length} produtos`);

    // Criar stream de resposta
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Função para enviar dados
        const sendData = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const startTime = Date.now();
          const results: BatchAnalysisResult[] = [];
          let successCount = 0;
          let errorCount = 0;

          // Inicializar resultados
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
              message: 'Aguardando processamento...',
              steps: {
                imageAnalysis: { success: false, message: 'Aguardando...' },
                titleGeneration: { success: false, message: 'Aguardando...' },
                descriptionGeneration: { success: false, message: 'Aguardando...' },
                characteristicsGeneration: { success: false, message: 'Aguardando...' },
                anymarketSync: { success: false, message: 'Aguardando...' },
                imageCrop: { success: false, message: 'Aguardando...' }
              }
            });
          }

          // Enviar estado inicial
          sendData({
            type: 'init',
            data: {
              total: productIds.length,
              results: results
            }
          });

          // Processar cada produto sequencialmente
          for (let i = 0; i < productIds.length; i++) {
            const productId = productIds[i];
            const productStartTime = Date.now();
            
            console.log(`\n📦 Processando produto ${i + 1}/${productIds.length}: ${productId}`);
            
            // ETAPA 1: Análise de Imagem
            results[i].message = 'Executando análise de imagem...';
            results[i].steps.imageAnalysis.message = 'Executando...';
            
            sendData({
              type: 'progress',
              data: {
                currentIndex: i,
                currentProduct: results[i].productName,
                currentStep: 'imageAnalysis',
                results: results
              }
            });

            try {
              // Executar análise de imagem
              const analysisResult = await executeImageAnalysis(productId);
              
              if (analysisResult.success) {
                results[i].steps.imageAnalysis.success = true;
                results[i].steps.imageAnalysis.message = 'Análise de imagem concluída';
                results[i].steps.imageAnalysis.duration = Date.now() - productStartTime;
              } else {
                results[i].steps.imageAnalysis.success = false;
                results[i].steps.imageAnalysis.error = analysisResult.error;
                results[i].steps.imageAnalysis.message = `Erro: ${analysisResult.error}`;
                results[i].steps.imageAnalysis.duration = Date.now() - productStartTime;
              }

              // Enviar atualização da análise de imagem
              sendData({
                type: 'step_update',
                data: {
                  currentIndex: i,
                  step: 'imageAnalysis',
                  result: results[i],
                  results: results
                }
              });

            } catch (error: any) {
              console.error(`❌ Erro na análise de imagem do produto ${productId}:`, error);
              
              results[i].steps.imageAnalysis.success = false;
              results[i].steps.imageAnalysis.error = error.message;
              results[i].steps.imageAnalysis.message = `Erro crítico: ${error.message}`;
              results[i].steps.imageAnalysis.duration = Date.now() - productStartTime;
            }

            // ETAPA 2: Geração de Título (apenas se análise de imagem foi bem-sucedida)
            if (results[i].steps.imageAnalysis.success) {
              const titleStartTime = Date.now();
              results[i].message = 'Gerando título do produto...';
              results[i].steps.titleGeneration.message = 'Executando...';
              
              sendData({
                type: 'progress',
                data: {
                  currentIndex: i,
                  currentProduct: results[i].productName,
                  currentStep: 'titleGeneration',
                  results: results
                }
              });

              try {
                // Executar geração de título
                const titleResult = await executeTitleGeneration(productId);
                
                if (titleResult.success) {
                  results[i].steps.titleGeneration.success = true;
                  results[i].steps.titleGeneration.message = 'Título gerado com sucesso';
                  results[i].steps.titleGeneration.duration = Date.now() - titleStartTime;
                } else {
                  results[i].steps.titleGeneration.success = false;
                  results[i].steps.titleGeneration.error = titleResult.error;
                  results[i].steps.titleGeneration.message = `Erro: ${titleResult.error}`;
                  results[i].steps.titleGeneration.duration = Date.now() - titleStartTime;
                }

                // Enviar atualização da geração de título
                sendData({
                  type: 'step_update',
                  data: {
                    currentIndex: i,
                    step: 'titleGeneration',
                    result: results[i],
                    results: results
                  }
                });

              } catch (error: any) {
                console.error(`❌ Erro na geração de título do produto ${productId}:`, error);
                
                results[i].steps.titleGeneration.success = false;
                results[i].steps.titleGeneration.error = error.message;
                results[i].steps.titleGeneration.message = `Erro crítico: ${error.message}`;
                results[i].steps.titleGeneration.duration = Date.now() - titleStartTime;
              }

              // ETAPA 3: Geração de Descrição (apenas se título foi bem-sucedido)
              if (results[i].steps.titleGeneration.success) {
                const descriptionStartTime = Date.now();
                results[i].message = 'Gerando descrição do produto...';
                results[i].steps.descriptionGeneration.message = 'Executando...';
                
                sendData({
                  type: 'progress',
                  data: {
                    currentIndex: i,
                    currentProduct: results[i].productName,
                    currentStep: 'descriptionGeneration',
                    results: results
                  }
                });

                try {
                  // Executar geração de descrição
                  const descriptionResult = await executeDescriptionGeneration(productId);
                  
                  if (descriptionResult.success) {
                    results[i].steps.descriptionGeneration.success = true;
                    results[i].steps.descriptionGeneration.message = 'Descrição gerada com sucesso';
                    results[i].steps.descriptionGeneration.duration = Date.now() - descriptionStartTime;
                  } else {
                    results[i].steps.descriptionGeneration.success = false;
                    results[i].steps.descriptionGeneration.error = descriptionResult.error;
                    results[i].steps.descriptionGeneration.message = `Erro: ${descriptionResult.error}`;
                    results[i].steps.descriptionGeneration.duration = Date.now() - descriptionStartTime;
                  }

                  // Enviar atualização da geração de descrição
                  sendData({
                    type: 'step_update',
                    data: {
                      currentIndex: i,
                      step: 'descriptionGeneration',
                      result: results[i],
                      results: results
                    }
                  });

                } catch (error: any) {
                  console.error(`❌ Erro na geração de descrição do produto ${productId}:`, error);
                  
                  results[i].steps.descriptionGeneration.success = false;
                  results[i].steps.descriptionGeneration.error = error.message;
                  results[i].steps.descriptionGeneration.message = `Erro crítico: ${error.message}`;
                  results[i].steps.descriptionGeneration.duration = Date.now() - descriptionStartTime;
                }

                // ETAPA 4: Geração de Características (apenas se descrição foi bem-sucedida)
                if (results[i].steps.descriptionGeneration.success) {
                  const characteristicsStartTime = Date.now();
                  results[i].message = 'Gerando características do produto...';
                  results[i].steps.characteristicsGeneration.message = 'Executando...';
                  
                  sendData({
                    type: 'progress',
                    data: {
                      currentIndex: i,
                      currentProduct: results[i].productName,
                      currentStep: 'characteristicsGeneration',
                      results: results
                    }
                  });

                  try {
                    // Executar geração de características
                    const characteristicsResult = await executeCharacteristicsGeneration(productId);
                    
                    if (characteristicsResult.success) {
                      results[i].steps.characteristicsGeneration.success = true;
                      results[i].steps.characteristicsGeneration.message = 'Características geradas com sucesso';
                      results[i].steps.characteristicsGeneration.duration = Date.now() - characteristicsStartTime;
                    } else {
                      results[i].steps.characteristicsGeneration.success = false;
                      results[i].steps.characteristicsGeneration.error = characteristicsResult.error;
                      results[i].steps.characteristicsGeneration.message = `Erro: ${characteristicsResult.error}`;
                      results[i].steps.characteristicsGeneration.duration = Date.now() - characteristicsStartTime;
                    }

                    // Enviar atualização da geração de características
                    sendData({
                      type: 'step_update',
                      data: {
                        currentIndex: i,
                        step: 'characteristicsGeneration',
                        result: results[i],
                        results: results
                      }
                    });

                  } catch (error: any) {
                    console.error(`❌ Erro na geração de características do produto ${productId}:`, error);
                    
                    results[i].steps.characteristicsGeneration.success = false;
                    results[i].steps.characteristicsGeneration.error = error.message;
                    results[i].steps.characteristicsGeneration.message = `Erro crítico: ${error.message}`;
                    results[i].steps.characteristicsGeneration.duration = Date.now() - characteristicsStartTime;
                  }

                  // ETAPA 5: Sincronização AnyMarket (apenas se características foram bem-sucedidas)
                  if (results[i].steps.characteristicsGeneration.success) {
                    const anymarketStartTime = Date.now();
                    results[i].message = 'Sincronizando com AnyMarket...';
                    results[i].steps.anymarketSync.message = 'Executando...';
                    
                    sendData({
                      type: 'progress',
                      data: {
                        currentIndex: i,
                        currentProduct: results[i].productName,
                        currentStep: 'anymarketSync',
                        results: results
                      }
                    });

                    try {
                      // Executar sincronização AnyMarket
                      const anymarketResult = await executeAnymarketSync(productId);
                      
                      if (anymarketResult.success) {
                        results[i].steps.anymarketSync.success = true;
                        results[i].steps.anymarketSync.message = 'Sincronização AnyMarket concluída';
                        results[i].steps.anymarketSync.duration = Date.now() - anymarketStartTime;
                        results[i].success = true;
                        results[i].message = 'Otimização completa concluída com sucesso';
                        successCount++;
                      } else {
                        results[i].steps.anymarketSync.success = false;
                        results[i].steps.anymarketSync.error = anymarketResult.error;
                        results[i].steps.anymarketSync.message = `Erro: ${anymarketResult.error}`;
                        results[i].steps.anymarketSync.duration = Date.now() - anymarketStartTime;
                        results[i].success = false;
                        results[i].message = 'Características geradas, mas erro na sincronização AnyMarket';
                        errorCount++;
                      }

                      // Enviar atualização da sincronização AnyMarket
                      sendData({
                        type: 'step_update',
                        data: {
                          currentIndex: i,
                          step: 'anymarketSync',
                          result: results[i],
                          results: results
                        }
                      });

                    } catch (error: any) {
                      console.error(`❌ Erro na sincronização AnyMarket do produto ${productId}:`, error);
                      
                      results[i].steps.anymarketSync.success = false;
                      results[i].steps.anymarketSync.error = error.message;
                      results[i].steps.anymarketSync.message = `Erro crítico: ${error.message}`;
                      results[i].steps.anymarketSync.duration = Date.now() - anymarketStartTime;
                      results[i].success = false;
                      results[i].message = 'Características geradas, mas erro na sincronização AnyMarket';
                      errorCount++;
                    }

                    // ETAPA 6: Crop de Imagens (apenas se sincronização AnyMarket foi bem-sucedida)
                    if (results[i].steps.anymarketSync.success) {
                      const cropStartTime = Date.now();
                      results[i].message = 'Executando crop de imagens...';
                      results[i].steps.imageCrop.message = 'Executando...';
                      
                      sendData({
                        type: 'progress',
                        data: {
                          currentIndex: i,
                          currentProduct: results[i].productName,
                          currentStep: 'imageCrop',
                          results: results
                        }
                      });

                      try {
                        // Executar crop de imagens
                        const cropResult = await executeImageCrop(productId);
                        
                        if (cropResult.success) {
                          results[i].steps.imageCrop.success = true;
                          results[i].steps.imageCrop.message = 'Crop de imagens concluído';
                          results[i].steps.imageCrop.duration = Date.now() - cropStartTime;
                          results[i].success = true;
                          results[i].message = 'Otimização completa concluída com sucesso';
                          successCount++;
                        } else {
                          results[i].steps.imageCrop.success = false;
                          results[i].steps.imageCrop.error = cropResult.error;
                          results[i].steps.imageCrop.message = `Erro: ${cropResult.error}`;
                          results[i].steps.imageCrop.duration = Date.now() - cropStartTime;
                          results[i].success = false;
                          results[i].message = 'Sincronização concluída, mas erro no crop de imagens';
                          errorCount++;
                        }

                        // Enviar atualização do crop de imagens
                        sendData({
                          type: 'step_update',
                          data: {
                            currentIndex: i,
                            step: 'imageCrop',
                            result: results[i],
                            results: results
                          }
                        });

                      } catch (error: any) {
                        console.error(`❌ Erro no crop de imagens do produto ${productId}:`, error);
                        
                        results[i].steps.imageCrop.success = false;
                        results[i].steps.imageCrop.error = error.message;
                        results[i].steps.imageCrop.message = `Erro crítico: ${error.message}`;
                        results[i].steps.imageCrop.duration = Date.now() - cropStartTime;
                        results[i].success = false;
                        results[i].message = 'Sincronização concluída, mas erro no crop de imagens';
                        errorCount++;
                      }
                    } else {
                      // Se sincronização AnyMarket falhou, marcar crop de imagens como não executado
                      results[i].steps.imageCrop.success = false;
                      results[i].steps.imageCrop.message = 'Não executado (sincronização AnyMarket falhou)';
                      results[i].success = false;
                      results[i].message = 'Características geradas, mas erro na sincronização AnyMarket';
                      errorCount++;
                    }
                  } else {
                    // Se geração de características falhou, marcar etapas seguintes como não executadas
                    results[i].steps.anymarketSync.success = false;
                    results[i].steps.anymarketSync.message = 'Não executado (geração de características falhou)';
                    results[i].steps.imageCrop.success = false;
                    results[i].steps.imageCrop.message = 'Não executado (geração de características falhou)';
                    results[i].success = false;
                    results[i].message = 'Descrição gerada, mas erro na geração de características';
                    errorCount++;
                  }
                } else {
                  // Se geração de descrição falhou, marcar etapas seguintes como não executadas
                  results[i].steps.characteristicsGeneration.success = false;
                  results[i].steps.characteristicsGeneration.message = 'Não executado (geração de descrição falhou)';
                  results[i].steps.anymarketSync.success = false;
                  results[i].steps.anymarketSync.message = 'Não executado (geração de descrição falhou)';
                  results[i].steps.imageCrop.success = false;
                  results[i].steps.imageCrop.message = 'Não executado (geração de descrição falhou)';
                  results[i].success = false;
                  results[i].message = 'Título gerado, mas erro na geração de descrição';
                  errorCount++;
                }
              } else {
                // Se geração de título falhou, marcar etapas seguintes como não executadas
                results[i].steps.descriptionGeneration.success = false;
                results[i].steps.descriptionGeneration.message = 'Não executado (geração de título falhou)';
                results[i].steps.characteristicsGeneration.success = false;
                results[i].steps.characteristicsGeneration.message = 'Não executado (geração de título falhou)';
                results[i].steps.anymarketSync.success = false;
                results[i].steps.anymarketSync.message = 'Não executado (geração de título falhou)';
                results[i].steps.imageCrop.success = false;
                results[i].steps.imageCrop.message = 'Não executado (geração de título falhou)';
                results[i].success = false;
                results[i].message = 'Análise concluída, mas erro na geração de título';
                errorCount++;
              }
            } else {
              // Se análise de imagem falhou, marcar etapas seguintes como não executadas
              results[i].steps.titleGeneration.success = false;
              results[i].steps.titleGeneration.message = 'Não executado (análise de imagem falhou)';
              results[i].steps.descriptionGeneration.success = false;
              results[i].steps.descriptionGeneration.message = 'Não executado (análise de imagem falhou)';
              results[i].steps.characteristicsGeneration.success = false;
              results[i].steps.characteristicsGeneration.message = 'Não executado (análise de imagem falhou)';
              results[i].steps.anymarketSync.success = false;
              results[i].steps.anymarketSync.message = 'Não executado (análise de imagem falhou)';
              results[i].steps.imageCrop.success = false;
              results[i].steps.imageCrop.message = 'Não executado (análise de imagem falhou)';
              results[i].success = false;
              results[i].message = 'Erro na análise de imagem';
              errorCount++;
            }

            results[i].duration = Date.now() - productStartTime;
            console.log(`✅ Produto ${productId} processado em ${results[i].duration}ms: ${results[i].message}`);

            // Enviar atualização final do produto
            sendData({
              type: 'update',
              data: {
                currentIndex: i,
                result: results[i],
                results: results,
                successCount,
                errorCount
              }
            });

            // Pequena pausa entre produtos
            if (i < productIds.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          const totalTime = Date.now() - startTime;
          console.log(`🏁 Análise de imagens em lote concluída em ${totalTime}ms: ${successCount} sucessos, ${errorCount} erros`);

          // Enviar resultado final
          sendData({
            type: 'complete',
            data: {
              total: productIds.length,
              success: successCount,
              errors: errorCount,
              results: results,
              totalTime
            }
          });

        } catch (error: any) {
          console.error('❌ Erro na análise de imagens em lote:', error);
          sendData({
            type: 'error',
            data: {
              error: error.message
            }
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('❌ Erro na análise de imagens em lote:', error);
    return new Response('Erro interno do servidor', { status: 500 });
  }
}

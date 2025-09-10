'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  X, Loader2, Image as ImageIcon, CheckCircle, AlertCircle, 
  Zap, Clock, FileImage, Play, Square, History
} from 'lucide-react';

interface CropImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    anymarket_id: string;
  } | null;
  originalImages: Array<{
    id: string;
    variation: string;
    originalImage: string;
    isMain: boolean;
    index: number;
  }>;
}

interface VtexImage {
  id: number;
  skuId: number;
  skuName: string;
  skuColor: string;
    url: string;
  isPrimary: boolean;
  position: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

interface ProcessedProduct {
  productId: number;
  anymarketId: string;
  productName: string;
  lastProcessedAt: string;
  totalProcessingCount: number;
  lastStatus: string;
  lastCompletedAt: string;
  lastTotalImages: number;
  lastProcessedImages: number;
}

export function CropImagesModal({ isOpen, onClose, product, originalImages }: CropImagesModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Estados para imagens da VTEX
  const [vtexImages, setVtexImages] = useState<VtexImage[]>([]);
  const [isLoadingVtexImages, setIsLoadingVtexImages] = useState(false);
  const [vtexImagesError, setVtexImagesError] = useState<string | null>(null);
  
  // Estados para imagens processadas
  const [processedImages, setProcessedImages] = useState<any[]>([]);
  
  // Estados para produto processado
  const [processedProduct, setProcessedProduct] = useState<ProcessedProduct | null>(null);
  const [isCheckingProcessed, setIsCheckingProcessed] = useState(false);
  const [processingLogId, setProcessingLogId] = useState<number | null>(null);

  // Função para adicionar logs
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    setLogs(prev => [...prev, logEntry]);
    console.log(`[${level.toUpperCase()}] ${message}`, details);
  }, []);

  // Função para limpar logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setCurrentStep('');
    setProgress({ current: 0, total: 0 });
    setProcessedImages([]);
  }, []);

  // Função para verificar se produto já foi processado
  const checkIfProductProcessed = useCallback(async (productId: number, anymarketId: string) => {
    setIsCheckingProcessed(true);
    try {
      const response = await fetch(`/api/processed-products?productId=${productId}&anymarketId=${anymarketId}`);
      const result = await response.json();
      
      if (result.success && result.data.isProcessed) {
        setProcessedProduct(result.data.processedProduct);
        addLog('info', `📋 Produto já foi processado ${result.data.processedProduct.totalProcessingCount} vez(es)`, {
          lastProcessedAt: result.data.processedProduct.lastProcessedAt,
          lastStatus: result.data.processedProduct.lastStatus,
          totalProcessingCount: result.data.processedProduct.totalProcessingCount
        });
      } else {
        setProcessedProduct(null);
        addLog('info', '🆕 Produto ainda não foi processado');
      }
    } catch (error: any) {
      addLog('warning', '⚠️ Erro ao verificar histórico do produto', { error: error.message });
    } finally {
      setIsCheckingProcessed(false);
    }
  }, [addLog]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen && product) {
      clearLogs();
      setVtexImages([]);
      setVtexImagesError(null);
      setProcessedProduct(null);
      setProcessingLogId(null);
      
      // Verificar se produto já foi processado
      checkIfProductProcessed(product.id, product.anymarket_id);
    }
  }, [isOpen, product, clearLogs, checkIfProductProcessed]);

  if (!isOpen || !product) {
    return null;
  }

  const handleProcessImages = async () => {
    if (!product) return;

    setIsProcessing(true);
    clearLogs();
    
    const startTime = Date.now();
    
    addLog('info', '🚀 Iniciando processamento de imagens da VTEX...', {
      productId: product.id,
      anymarketId: product.anymarket_id
    });

    // Criar log de processamento
    let logId: number | null = null;
    try {
      const logResponse = await fetch('/api/crop-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          anymarketId: product.anymarket_id,
          productName: product.name,
          status: 'processing'
        })
      });
      
      const logResult = await logResponse.json();
      if (logResult.success) {
        logId = logResult.data.logId;
        setProcessingLogId(logId);
        addLog('info', '📝 Log de processamento criado', { logId });
      }
    } catch (error) {
      addLog('warning', '⚠️ Erro ao criar log de processamento', { error });
    }

    try {
      // ETAPA 1: Deletar imagens antigas do Anymarket
      setCurrentStep('Etapa 1: Deletando imagens antigas do Anymarket...');
      addLog('info', '🗑️ ETAPA 1: Deletando imagens antigas do Anymarket...');

      try {
        // Primeiro, buscar as imagens existentes no Anymarket
        addLog('info', '🔍 Buscando imagens existentes no Anymarket...');
        
        const existingImagesResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}/images`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg=='
          }
        });

        if (existingImagesResponse.ok) {
          const existingImages = await existingImagesResponse.json();
          addLog('info', `📊 Encontradas ${existingImages.length} imagens existentes no Anymarket`);

          if (existingImages.length > 0) {
            // Deletar cada imagem existente
            let deletedCount = 0;
            let deleteErrorCount = 0;

            for (let i = 0; i < existingImages.length; i++) {
              const image = existingImages[i];
              setCurrentStep(`Etapa 1: Deletando imagem ${i + 1}/${existingImages.length}...`);
              
              try {
                addLog('info', `🗑️ Deletando imagem ${i + 1}: ID ${image.id}`);

                const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}/images/${image.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'gumgaToken': 'MjU5MDYwMTI2Lg==.VUKD1GexT37TSdrKxLvKI7/lhLXBG+WN3vKbTq4n0sQLL6p0m62amTpp3BXjhFToKYfXraWbZOL556bHkCPnFg=='
                  }
                });

                if (deleteResponse.ok) {
                  deletedCount++;
                  addLog('success', `✅ Imagem ${i + 1} deletada com sucesso: ID ${image.id}`);
                } else {
                  deleteErrorCount++;
                  const errorText = await deleteResponse.text();
                  addLog('error', `❌ Erro ao deletar imagem ${i + 1}: ID ${image.id}`, {
                    error: errorText,
                    status: deleteResponse.status
                  });
                }
              } catch (error: any) {
                deleteErrorCount++;
                addLog('error', `❌ Erro de conexão ao deletar imagem ${i + 1}: ID ${image.id}`, {
                  error: error.message
                });
              }

              // Pequena pausa entre deleções
              if (i < existingImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            addLog('success', `✅ ETAPA 1: Deleção concluída! ${deletedCount} imagens deletadas, ${deleteErrorCount} erros`, {
              totalFound: existingImages.length,
              deletedCount: deletedCount,
              deleteErrorCount: deleteErrorCount
            });
          } else {
            addLog('info', 'ℹ️ Nenhuma imagem existente encontrada no Anymarket');
          }

        } else {
          const errorText = await existingImagesResponse.text();
          addLog('warning', `⚠️ Não foi possível buscar imagens existentes no Anymarket`, {
            error: errorText,
            status: existingImagesResponse.status
          });
        }
      } catch (error: any) {
        addLog('error', '❌ Erro de conexão ao deletar imagens antigas', {
          message: error.message
        });
      }

      // ETAPA 2: Buscar imagens da VTEX
      setCurrentStep('Etapa 2: Buscando imagens da VTEX...');
      addLog('info', '🔍 ETAPA 2: Buscando imagens da VTEX no banco de dados...');
      
      const response = await fetch('/api/crop-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: product.id,
          anymarketId: product.anymarket_id
        })
      });

      setCurrentStep('Etapa 2: Processando resposta...');
      addLog('info', '📊 ETAPA 2: Processando resposta da API...');

      const result = await response.json();

      if (result.success) {
        setVtexImages(result.data.images);
        
        addLog('success', `✅ ETAPA 2: Encontradas ${result.data.totalImages} imagens da VTEX para processar`, {
          totalImages: result.data.totalImages,
          images: result.data.images.map((img: VtexImage) => ({
            id: img.id,
            skuName: img.skuName,
            skuColor: img.skuColor,
            url: img.url,
            isPrimary: img.isPrimary,
            position: img.position
          }))
        });

        // ETAPA 3: Processar cada imagem com Pixian.ai
        setCurrentStep('Etapa 3: Processando com Pixian.ai...');
        addLog('info', '🎨 ETAPA 3: Processando imagens com Pixian.ai...');

        const processedResults = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < result.data.images.length; i++) {
          const image = result.data.images[i];
          setCurrentStep(`Etapa 3: Processando imagem ${i + 1}/${result.data.totalImages}...`);
          
          try {
            addLog('info', `🔄 Processando imagem ${i + 1}: ${image.skuName}`, {
              imageUrl: image.url,
              skuName: image.skuName,
              skuColor: image.skuColor
            });

            const pixianResponse = await fetch('/api/process-pixian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
                imageUrl: image.url,
                fileName: `vtex_${image.id}_${Date.now()}.jpg`
        })
      });

            const pixianResult = await pixianResponse.json();

            if (pixianResult.success) {
              successCount++;
              processedResults.push(pixianResult.data);
              
              // Armazenar dados da imagem processada para exibir miniaturas
              setProcessedImages(prev => [...prev, {
                id: image.id,
                skuName: image.skuName,
                skuColor: image.skuColor,
                isPrimary: image.isPrimary,
                position: image.position,
                originalUrl: pixianResult.data.originalUrl,
                processedUrl: pixianResult.data.processedUrl,
                fileName: pixianResult.data.fileName
              }]);
              
              addLog('success', `✅ Imagem ${i + 1} processada com sucesso: ${image.skuName}`, {
                originalUrl: pixianResult.data.originalUrl,
                processedUrl: pixianResult.data.processedUrl,
                fileName: pixianResult.data.fileName,
                pixianPayload: pixianResult.data.pixianPayload,
                requestDetails: pixianResult.data.requestDetails
              });
            } else {
              errorCount++;
              addLog('error', `❌ Erro ao processar imagem ${i + 1}: ${image.skuName}`, {
                error: pixianResult.message
              });
            }
          } catch (error: any) {
            errorCount++;
            addLog('error', `❌ Erro de conexão na imagem ${i + 1}: ${image.skuName}`, {
              error: error.message
            });
          }

          // Pequena pausa entre processamentos
          if (i < result.data.images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // ETAPA 4: Enviar para Anymarket
        if (successCount > 0) {
          setCurrentStep('Etapa 4: Enviando para Anymarket...');
          addLog('info', '🛒 ETAPA 4: Enviando imagens processadas para Anymarket...');

          try {
            const anymarketResponse = await fetch('/api/upload-anymarket', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                anymarketId: product.anymarket_id,
                images: processedResults.map((result, index) => ({
                  skuId: result.skuId || result.id,
                  skuName: result.skuName,
                  originalUrl: result.originalUrl,
                  processedUrl: result.processedUrl,
                  index: index,
                  main: index === 0
                }))
              })
            });

            const anymarketResult = await anymarketResponse.json();

            if (anymarketResult.success) {
              addLog('success', `✅ ETAPA 3: Upload para Anymarket concluído! ${anymarketResult.data.totalProcessed} imagens enviadas`, {
                totalProcessed: anymarketResult.data.totalProcessed,
                totalErrors: anymarketResult.data.totalErrors,
                successRate: anymarketResult.data.successRate,
                results: anymarketResult.data.results,
                errors: anymarketResult.data.errors
              });

              // Log detalhado de cada imagem enviada
              anymarketResult.data.results.forEach((result: any, index: number) => {
                addLog('success', `📤 Imagem ${index + 1} enviada para Anymarket: ${result.skuName}`, {
                  skuId: result.skuId,
                  skuName: result.skuName,
                  newImageId: result.newImageId,
                  index: result.index,
                  main: result.main,
                  processedUrl: result.processedUrl,
                  anymarketResponse: result.anymarketResponse,
                  requestDetails: result.requestDetails
                });
              });

              // Log de erros se houver
              if (anymarketResult.data.errors.length > 0) {
                anymarketResult.data.errors.forEach((error: any, index: number) => {
                  addLog('error', `❌ Erro no upload da imagem: ${error.skuName}`, {
                    skuId: error.skuId,
                    skuName: error.skuName,
                    error: error.error,
                    processedUrl: error.processedUrl
                  });
                });
              }

            } else {
              addLog('error', '❌ Erro no upload para Anymarket', {
                message: anymarketResult.message,
                error: anymarketResult.error
              });
            }
          } catch (error: any) {
            addLog('error', '❌ Erro de conexão no upload para Anymarket', {
              message: error.message
            });
          }
        }
        
        // ETAPA 5: Mostrar resultados finais
        setCurrentStep('Etapa 5: Exibindo resultados...');
        addLog('success', `🎉 ETAPA 5: Processamento completo! ${successCount} imagens processadas com Pixian.ai`, {
          totalProcessed: successCount,
          totalErrors: errorCount,
          processedResults: processedResults
        });

        setCurrentStep('Concluído!');
        setProgress({ current: result.data.totalImages, total: result.data.totalImages });

        // Atualizar log com sucesso
        if (logId) {
          const processingTime = Math.round((Date.now() - startTime) / 1000);
          await updateProcessingLog(logId, 'completed', {
            processedImages: successCount,
            failedImages: errorCount,
            pixianSuccessCount: successCount,
            pixianErrorCount: errorCount,
            anymarketSuccessCount: successCount,
            anymarketErrorCount: 0,
            processingTimeSeconds: processingTime,
            details: {
              totalImages: result.data.totalImages,
              processedResults: processedResults
            }
          });
        }

      } else {
        addLog('error', '❌ Erro ao buscar imagens da VTEX', {
          message: result.message
        });
        setCurrentStep('Erro na busca');
        
        // Atualizar log com erro
        if (logId) {
          await updateProcessingLog(logId, 'failed', {
            errorMessage: result.message
          });
        }
      }

    } catch (error: any) {
      addLog('error', '❌ Erro de conexão', {
        message: error.message,
        stack: error.stack
      });
      setCurrentStep('Erro de conexão');
      
      // Atualizar log com erro
      if (logId) {
        await updateProcessingLog(logId, 'failed', {
          errorMessage: error.message
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para atualizar log de processamento
  const updateProcessingLog = async (logId: number, status: string, data: any) => {
    try {
      await fetch('/api/crop-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          status,
          ...data
        })
      });
    } catch (error) {
      console.error('Erro ao atualizar log:', error);
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-blue-500" />;
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className={`text-white p-6 ${processedProduct ? 'bg-gradient-to-r from-orange-600 to-orange-700' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center ${processedProduct ? 'bg-orange-500/30' : ''}`}>
                  {processedProduct ? (
                    <History className="h-6 w-6" />
                  ) : (
                    <ImageIcon className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {processedProduct ? 'Produto Processado' : 'Imagens da VTEX'}
                  </h2>
                  <p className="text-blue-100 text-sm">{product.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${processedProduct ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                  ID: {product.anymarket_id}
                </span>
                {processedProduct && (
                  <span className="flex items-center gap-1 bg-orange-500/30 px-2 py-1 rounded-full">
                    <History className="h-3 w-3" />
                    Processado {processedProduct.totalProcessingCount}x
                  </span>
                )}
              </div>
            </div>
              <button
                onClick={() => {
                if (!isProcessing) {
                  onClose();
                }
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              disabled={isProcessing}
              >
                <X className="h-6 w-6" />
              </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="font-medium text-gray-900">{currentStep}</span>
              </div>
                    <span className="text-sm text-gray-600">
                {progress.current}/{progress.total}
                    </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Botão de ação simplificado */}
          {!isProcessing && logs.length === 0 && (
            <div className="text-center py-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {processedProduct ? 'Reprocessar Imagens' : 'Processar Imagens'}
              </h3>
              
              {processedProduct && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    Processado {processedProduct.totalProcessingCount}x • {new Date(processedProduct.lastProcessedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleProcessImages}
                  className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 font-medium ${
                    processedProduct 
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  {processedProduct ? 'Reprocessar' : 'Processar'}
                </button>
                
                {processedProduct && (
                  <button
                    onClick={() => window.open(`/crop-logs?productId=${product.id}`, '_blank')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    Histórico
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Logs simplificados */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-gray-900">Progresso</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {logs.filter(l => l.level === 'success').length}✓ {logs.filter(l => l.level === 'error').length}✗
                  </span>
                  {!isProcessing && (
                    <button
                      onClick={clearLogs}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded border-l-4 ${getLogColor(log.level)}`}
                  >
                    <div className="flex items-center gap-2">
                      {getLogIcon(log.level)}
                      <p className="text-sm">{log.message}</p>
                      <span className="text-xs text-gray-500 ml-auto">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado simplificado */}
          {!isProcessing && processedImages.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-900">
                  {processedImages.length} imagem(ns) processada(s)
                </h3>
              </div>
              <p className="text-sm text-green-700">
                Imagens processadas com Pixian.ai e enviadas para Anymarket
              </p>
            </div>
          )}

          {/* Botão fechar */}
          {!isProcessing && logs.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
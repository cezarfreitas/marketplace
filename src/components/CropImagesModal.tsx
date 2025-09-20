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
  onProcessingComplete?: (productId: number) => void;
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

export function CropImagesModal({ isOpen, onClose, product, originalImages, onProcessingComplete }: CropImagesModalProps) {
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
  
  // Estados para modal de logs
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [cropLogs, setCropLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
        // Só adicionar log se houver logs anteriores ou se estiver reprocessando
        if (result.data.processedProduct.totalProcessingCount > 0) {
          addLog('info', `📋 Produto já foi processado ${result.data.processedProduct.totalProcessingCount} vez(es)`, {
            lastProcessedAt: result.data.processedProduct.lastProcessedAt,
            lastStatus: result.data.processedProduct.lastStatus,
            totalProcessingCount: result.data.processedProduct.totalProcessingCount
          });
        }
      } else {
        setProcessedProduct(null);
        // Não adicionar log para produtos não processados
      }
    } catch (error: any) {
      addLog('warning', '⚠️ Erro ao verificar histórico do produto', { error: error.message });
    } finally {
      setIsCheckingProcessed(false);
    }
  }, [addLog]);

  // Função para carregar logs anteriores
  const loadPreviousLogs = useCallback(async (productId: number) => {
    try {
      const response = await fetch(`/api/crop-logs?productId=${productId}&limit=10`);
      const result = await response.json();
      
      if (result.success && result.data.logs.length > 0) {
        // Converter logs do banco para formato do modal
        const previousLogs: LogEntry[] = result.data.logs.map((log: any) => ({
          id: log.id.toString(),
          timestamp: new Date(log.started_at),
          level: log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'info',
          message: `Processamento anterior: ${log.status === 'completed' ? 'Concluído' : log.status === 'failed' ? 'Falhou' : 'Processando'} - ${log.processed_images}/${log.total_images} imagens`,
          details: {
            logId: log.id,
            status: log.status,
            processedImages: log.processed_images,
            totalImages: log.total_images,
            processingTime: log.processing_time_seconds,
            completedAt: log.completed_at
          }
        }));
        
        setLogs(prev => [...previousLogs, ...prev]);
        // Só adicionar log de carregamento se houver logs para carregar
        if (previousLogs.length > 0) {
          addLog('info', `📜 Carregados ${previousLogs.length} log(s) anterior(es)`);
        }
      }
    } catch (error: any) {
      addLog('warning', '⚠️ Erro ao carregar logs anteriores', { error: error.message });
    }
  }, [addLog]);

  // Função para carregar logs detalhados
  const loadDetailedLogs = useCallback(async (productId: number) => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`/api/crop-logs?productId=${productId}&limit=50`);
      const result = await response.json();
      
      if (result.success) {
        setCropLogs(result.data.logs);
      }
    } catch (error: any) {
      console.error('Erro ao carregar logs detalhados:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

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

  // Carregar logs anteriores quando produto for processado
  useEffect(() => {
    if (processedProduct && product) {
      loadPreviousLogs(product.id);
    }
  }, [processedProduct, product, loadPreviousLogs]);

  // Carregar logs detalhados quando modal de logs for aberto
  useEffect(() => {
    if (showLogsModal && product) {
      loadDetailedLogs(product.id);
    }
  }, [showLogsModal, product, loadDetailedLogs]);

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

    // Criar log de processamento (apenas se anymarketId estiver disponível)
    let logId: number | null = null;
    if (product.anymarket_id) {
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
    } else {
      addLog('info', 'ℹ️ Produto sem anymarketId - processando apenas imagens VTEX', { productId: product.id });
    }

    try {
      // ETAPA 1: Deletar imagens antigas do Anymarket (apenas se anymarketId estiver disponível)
      if (product.anymarket_id) {
        setCurrentStep('Etapa 1: Deletando imagens antigas do Anymarket...');
        addLog('info', '🗑️ ETAPA 1: Deletando imagens antigas do Anymarket...');

        try {
          // Primeiro, buscar as imagens existentes no Anymarket via backend
          addLog('info', '🔍 Buscando imagens existentes no Anymarket...');
          
          const existingImagesResponse = await fetch('/api/anymarket/get-product', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId: product.anymarket_id })
          });

        if (existingImagesResponse.ok) {
          const response = await existingImagesResponse.json();
          const anymarketData = response.data?.anymarket_data;
          const existingImages = anymarketData?.images || [];
          
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
                    'gumgaToken': process.env.NEXT_PUBLIC_ANYMARKET || ''
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
      } else {
        addLog('info', '⏭️ ETAPA 1: Pulada - produto sem anymarketId');
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
          anymarketId: product.anymarket_id || null
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

        // Notificar que o processamento foi concluído
        if (onProcessingComplete && product) {
          console.log('🎯 Chamando onProcessingComplete com productId:', product.id);
          onProcessingComplete(product.id);
        } else {
          console.log('⚠️ onProcessingComplete não disponível ou product não definido:', {
            onProcessingComplete: !!onProcessingComplete,
            product: product
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

        // Notificar que o processamento foi concluído (mesmo com erro)
        if (onProcessingComplete && product) {
          console.log('🎯 Chamando onProcessingComplete (erro VTEX) com productId:', product.id);
          onProcessingComplete(product.id);
        } else {
          console.log('⚠️ onProcessingComplete não disponível (erro VTEX):', {
            onProcessingComplete: !!onProcessingComplete,
            product: product
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

      // Notificar que o processamento foi concluído (mesmo com erro)
      if (onProcessingComplete && product) {
        console.log('🎯 Chamando onProcessingComplete (erro conexão) com productId:', product.id);
        onProcessingComplete(product.id);
      } else {
        console.log('⚠️ onProcessingComplete não disponível (erro conexão):', {
          onProcessingComplete: !!onProcessingComplete,
          product: product
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              {processedProduct ? (
                <History className="w-5 h-5 text-white" />
              ) : (
                <ImageIcon className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {processedProduct ? 'Produto Processado' : 'Processar Imagens'}
                </h2>
                {processedProduct && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Processado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{product?.name}</p>
              {product?.anymarket_id && (
                <p className="text-xs text-gray-500 mt-1">ID: {product.anymarket_id}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!processedProduct && (
              <button
                onClick={handleProcessImages}
                disabled={isProcessing || !product}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Processar Imagens</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (!isProcessing) {
                  onClose();
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Processando Imagens</h3>
                  <p className="text-sm text-gray-600">{currentStep}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 p-6 overflow-y-auto">

            {/* Informações do Produto - Apenas se processado */}
            {processedProduct && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Histórico de Processamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-2">
                      Processado {processedProduct.totalProcessingCount}x
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Último Processamento:</span>
                    <p className="text-gray-600">{new Date(processedProduct.lastProcessedAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Produto:</span>
                    <p className="text-gray-600">{processedProduct.productName}</p>
                  </div>
                </div>
              </div>
            )}


            <div className="space-y-6">
              {/* Ações - Apenas se não processado */}
              {!processedProduct && !isProcessing && logs.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Pronto para Processar</h3>
                  <p className="text-gray-600 mb-6">
                    Clique no botão &quot;Processar Imagens&quot; no cabeçalho para iniciar o processamento das imagens do produto.
                  </p>
                </div>
              )}

              {/* Ações para produto processado */}
              {processedProduct && !isProcessing && logs.length === 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Produto Já Processado</h3>
                  <p className="text-gray-600 mb-4">
                    Este produto já foi processado {processedProduct.totalProcessingCount} vez(es).
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleProcessImages}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium"
                    >
                      <Play className="h-4 w-4" />
                      Reprocessar
                    </button>
                    <button
                      onClick={() => setShowLogsModal(true)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <History className="h-4 w-4" />
                      Ver Histórico
                    </button>
                  </div>
                </div>
              )}

            {/* Logs de Processamento */}
            {logs.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Logs de Processamento</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {logs.filter(l => l.level === 'success').length} sucessos, {logs.filter(l => l.level === 'error').length} erros
                    </span>
                    {!isProcessing && (
                      <button
                        onClick={clearLogs}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border ${getLogColor(log.level)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getLogIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resultado */}
            {!isProcessing && processedImages.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Processamento Concluído</h3>
                </div>
                <p className="text-sm text-green-700">
                  {processedImages.length} imagem(ns) processada(s) com Pixian.ai e enviada(s) para Anymarket
                </p>
              </div>
            )}

            {/* Botão Fechar */}
            {!isProcessing && logs.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Logs Detalhados */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <History className="w-6 h-6 mr-3 text-orange-600" />
                  Histórico de Processamento
                </h2>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingLogs ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-orange-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Carregando histórico...</p>
                </div>
              ) : cropLogs.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum histórico encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cropLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {log.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : log.status === 'failed' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                          <h3 className="font-semibold text-gray-900">
                            Processamento #{log.id}
                          </h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          log.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.status === 'completed' ? 'Concluído' : 
                           log.status === 'failed' ? 'Falhou' : 'Processando'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-700">Data:</span>
                          <p className="text-gray-600">{new Date(log.started_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Imagens:</span>
                          <p className="text-gray-600">{log.processed_images}/{log.total_images}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Tempo:</span>
                          <p className="text-gray-600">{log.processing_time_seconds}s</p>
                        </div>
                      </div>

                      {log.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <h4 className="font-medium text-red-900 mb-1">Erro:</h4>
                          <p className="text-red-600 text-sm">{log.error_message}</p>
                        </div>
                      )}

                      {log.details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium mb-2">
                            Ver detalhes técnicos
                          </summary>
                          <div className="bg-white rounded border p-3">
                            <pre className="text-xs text-gray-700 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
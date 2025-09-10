'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  X, Loader2, Image as ImageIcon, CheckCircle, AlertCircle, 
  Zap, Clock, FileImage, Play, Square
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

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      clearLogs();
      setVtexImages([]);
      setVtexImagesError(null);
    }
  }, [isOpen, clearLogs]);

  if (!isOpen || !product) {
    return null;
  }

  const handleProcessImages = async () => {
    if (!product) return;

    setIsProcessing(true);
    clearLogs();
    
    addLog('info', '🚀 Iniciando processamento de imagens da VTEX...', {
      productId: product.id,
      anymarketId: product.anymarket_id
    });

    try {
      // ETAPA 1: Buscar imagens da VTEX
      setCurrentStep('Etapa 1: Buscando imagens da VTEX...');
      addLog('info', '🔍 ETAPA 1: Buscando imagens da VTEX no banco de dados...');
      
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

      setCurrentStep('Etapa 1: Processando resposta...');
      addLog('info', '📊 ETAPA 1: Processando resposta da API...');

      const result = await response.json();

      if (result.success) {
        setVtexImages(result.data.images);
        
        addLog('success', `✅ ETAPA 1: Encontradas ${result.data.totalImages} imagens da VTEX para processar`, {
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

        // ETAPA 2: Processar cada imagem com Pixian.ai
        setCurrentStep('Etapa 2: Processando com Pixian.ai...');
        addLog('info', '🎨 ETAPA 2: Processando imagens com Pixian.ai...');

        const processedResults = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < result.data.images.length; i++) {
          const image = result.data.images[i];
          setCurrentStep(`Etapa 2: Processando imagem ${i + 1}/${result.data.totalImages}...`);
          
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

        // ETAPA 3: Upload para Anymarket
        if (successCount > 0) {
          setCurrentStep('Etapa 3: Enviando para Anymarket...');
          addLog('info', '🛒 ETAPA 3: Enviando imagens processadas para o Anymarket...');

          try {
            const uploadResponse = await fetch('/api/upload-anymarket', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                anymarketId: product.anymarket_id,
                images: processedResults
              })
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.success) {
              addLog('success', `✅ ETAPA 3: ${uploadResult.data.totalProcessed} imagens enviadas para o Anymarket com sucesso!`, {
                totalProcessed: uploadResult.data.totalProcessed,
                totalErrors: uploadResult.data.totalErrors,
                successRate: uploadResult.data.successRate,
                uploadResults: uploadResult.data.results
              });

              // Log detalhado de cada upload
              uploadResult.data.results.forEach((upload: any, index: number) => {
                addLog('success', `✅ Upload ${index + 1}: ${upload.skuName} enviada para Anymarket`, {
                  newImageId: upload.newImageId,
                  index: upload.index,
                  main: upload.main,
                  processedUrl: upload.processedUrl,
                  requestDetails: upload.requestDetails
                });
              });

              // Log de erros se houver
              if (uploadResult.data.errors.length > 0) {
                uploadResult.data.errors.forEach((error: any) => {
                  addLog('error', `❌ Erro no upload: ${error.skuName} - ${error.error}`);
                });
              }
            } else {
              addLog('error', '❌ Erro no upload para Anymarket', {
                message: uploadResult.message
              });
            }
          } catch (uploadError: any) {
            addLog('error', '❌ Erro de conexão no upload para Anymarket', {
              error: uploadError.message
            });
          }
        }

        // ETAPA 4: Mostrar resultados finais
        setCurrentStep('Etapa 4: Exibindo resultados...');
        addLog('success', `🎉 ETAPA 4: Processamento completo! ${successCount} imagens processadas`, {
          totalProcessed: successCount,
          totalErrors: errorCount,
          processedResults: processedResults
        });

        setCurrentStep('Concluído!');
        setProgress({ current: result.data.totalImages, total: result.data.totalImages });

      } else {
        addLog('error', '❌ Erro ao buscar imagens da VTEX', {
          message: result.message
        });
        setCurrentStep('Erro na busca');
      }

    } catch (error: any) {
      addLog('error', '❌ Erro de conexão', {
        message: error.message,
        stack: error.stack
      });
      setCurrentStep('Erro de conexão');
    } finally {
      setIsProcessing(false);
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Imagens da VTEX</h2>
                  <p className="text-blue-100 text-sm">{product.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  ID: {product.anymarket_id}
                </span>
                <span className="flex items-center gap-1">
                  <FileImage className="h-4 w-4" />
                  {vtexImages.length} imagens VTEX
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Pixian.ai
                </span>
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
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Botão de ação */}
          {!isProcessing && logs.length === 0 && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processar e Enviar Imagens para Anymarket
              </h3>
              <p className="text-gray-600 mb-6">
                Clique no botão abaixo para processar as imagens da VTEX com Pixian.ai e enviar para o Anymarket
              </p>
              <button
                onClick={handleProcessImages}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-3 font-medium shadow-lg mx-auto"
              >
                <Play className="h-5 w-5" />
                Processar e Enviar para Anymarket
              </button>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Logs de Processamento</h3>
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

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${getLogColor(log.level)} transition-all duration-200`}
                  >
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.message}</p>
                        
                        {/* Mostrar URLs das imagens da VTEX na etapa 1 */}
                        {log.message.includes('ETAPA 1: Encontradas') && log.details?.images && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">URLs das imagens que serão processadas:</p>
                            <div className="space-y-2">
                              {log.details.images.map((img: any, index: number) => (
                                <div
                                  key={img.id}
                                  className="bg-white rounded border border-gray-200 p-3"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {index + 1}. {img.skuName}
                                      </span>
                                      {img.isPrimary && (
                                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                          Principal
                                        </span>
                                      )}
                                      <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
                                        #{img.position}
                                      </span>
                            </div>
                                    <span className="text-xs text-gray-500">
                                      SKU: {img.id}
                                    </span>
                            </div>
                                  {img.skuColor && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      Cor: {img.skuColor}
                                    </p>
                                  )}
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-xs text-gray-600 mb-1">URL da imagem:</p>
                                    <p className="text-xs text-blue-600 font-mono break-all">
                                      {img.url}
                                    </p>
                          </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mostrar URLs do resultado do processamento */}
                        {log.message.includes('processada com sucesso') && log.details && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">URLs do resultado do processamento:</p>
                            <div className="space-y-3">
                              {/* URL Original */}
                              <div className="bg-blue-50 rounded border border-blue-200 p-3">
                                <p className="text-xs font-medium text-blue-800 mb-1">🔗 URL Original:</p>
                                <p className="text-xs text-blue-600 font-mono break-all">
                                  {log.details.originalUrl}
                                </p>
                              </div>
                              
                              {/* URL Processada */}
                              <div className="bg-green-50 rounded border border-green-200 p-3">
                                <p className="text-xs font-medium text-green-800 mb-1">✅ URL Processada (Pixian.ai):</p>
                                <p className="text-xs text-green-600 font-mono break-all">
                                  {log.details.processedUrl}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  Arquivo: {log.details.fileName}
                                </p>
                              </div>
                              </div>
                            </div>
                          )}

                        {/* Mostrar payload do Pixian */}
                        {log.details?.pixianPayload && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">📤 Payload enviado ao Pixian.ai:</p>
                            <div className="bg-gray-50 rounded border border-gray-200 p-3">
                              <pre className="text-xs text-gray-700 overflow-x-auto">
                                {JSON.stringify(log.details.pixianPayload, null, 2)}
                              </pre>
                            </div>
                </div>
              )}

                        {/* Mostrar detalhes completos das requisições curl */}
                        {log.details?.requestDetails && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">🔗 Detalhes completos das requisições:</p>
                            
                            {/* Requisição para Pixian */}
                            {log.details.requestDetails.pixian && (
                              <div className="mb-4 bg-purple-50 rounded border border-purple-200 p-3">
                                <p className="text-xs font-medium text-purple-800 mb-2">🎨 Requisição para Pixian.ai:</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-medium text-purple-700">Endpoint:</p>
                                    <p className="text-xs text-purple-600 font-mono">{log.details.requestDetails.pixian.endpoint}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-purple-700">Método:</p>
                                    <p className="text-xs text-purple-600 font-mono">{log.details.requestDetails.pixian.method}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-purple-700">Headers:</p>
                                    <pre className="text-xs text-purple-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.pixian.headers, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-purple-700">Payload:</p>
                                    <pre className="text-xs text-purple-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.pixian.payload, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-purple-700">Comando cURL:</p>
                                    <pre className="text-xs text-purple-600 overflow-x-auto bg-purple-100 p-2 rounded">
                                      {log.details.requestDetails.pixian.curlCommand}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Requisição para Upload */}
                            {log.details.requestDetails.upload && (
                              <div className="mb-4 bg-blue-50 rounded border border-blue-200 p-3">
                                <p className="text-xs font-medium text-blue-800 mb-2">📤 Requisição para Upload:</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-medium text-blue-700">Endpoint:</p>
                                    <p className="text-xs text-blue-600 font-mono">{log.details.requestDetails.upload.endpoint}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-blue-700">Método:</p>
                                    <p className="text-xs text-blue-600 font-mono">{log.details.requestDetails.upload.method}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-blue-700">Headers:</p>
                                    <pre className="text-xs text-blue-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.upload.headers, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-blue-700">Payload:</p>
                                    <pre className="text-xs text-blue-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.upload.payload, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-blue-700">Comando cURL:</p>
                                    <pre className="text-xs text-blue-600 overflow-x-auto bg-blue-100 p-2 rounded">
                                      {log.details.requestDetails.upload.curlCommand}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Requisição para Anymarket */}
                            {log.details.requestDetails.anymarket && (
                              <div className="bg-green-50 rounded border border-green-200 p-3">
                                <p className="text-xs font-medium text-green-800 mb-2">🛒 Requisição para Anymarket:</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-medium text-green-700">Endpoint:</p>
                                    <p className="text-xs text-green-600 font-mono">{log.details.requestDetails.anymarket.endpoint}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-green-700">Método:</p>
                                    <p className="text-xs text-green-600 font-mono">{log.details.requestDetails.anymarket.method}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-green-700">Headers:</p>
                                    <pre className="text-xs text-green-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.anymarket.headers, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-green-700">Payload:</p>
                                    <pre className="text-xs text-green-600 overflow-x-auto">
                                      {JSON.stringify(log.details.requestDetails.anymarket.payload, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-green-700">Comando cURL:</p>
                                    <pre className="text-xs text-green-600 overflow-x-auto bg-green-100 p-2 rounded">
                                      {log.details.requestDetails.anymarket.curlCommand}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {log.details && 
                         !log.message.includes('ETAPA 2: URLs das imagens da VTEX') && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 text-xs bg-white/50 p-2 rounded border overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
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

          {/* Miniaturas das imagens processadas */}
          {!isProcessing && processedImages.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  🎨 Imagens Processadas com Pixian.ai
                </h3>
                <span className="text-sm text-gray-600">
                  {processedImages.length} imagens processadas
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Imagem Original */}
                    <div className="p-3 border-b border-gray-100">
                      <h4 className="font-medium text-gray-900 text-sm mb-2">
                        {index + 1}. {img.skuName}
                      </h4>
                      {img.skuColor && (
                        <p className="text-xs text-gray-600 mb-2">
                          Cor: {img.skuColor}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {img.isPrimary && (
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                            Principal
                          </span>
                        )}
                        <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
                          #{img.position}
                        </span>
                      </div>
                    </div>
                    
                    {/* Comparação de Imagens */}
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {/* Imagem Original */}
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-2">Original</p>
                        <div className="aspect-square relative bg-gray-100 rounded border">
                          <img
                            src={img.originalUrl}
                            alt={`Original ${img.skuName}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Imagem Processada */}
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-2">Processada</p>
                        <div className="aspect-square relative bg-gray-100 rounded border">
                          <img
                            src={img.processedUrl}
                            alt={`Processada ${img.skuName}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                          <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                            ✅
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* URLs */}
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                      <details className="text-xs">
                        <summary className="text-gray-600 cursor-pointer hover:text-gray-800 mb-2">
                          Ver URLs
                        </summary>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-600 font-medium">Original:</p>
                            <p className="text-blue-600 font-mono break-all text-xs">
                              {img.originalUrl}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Processada:</p>
                            <p className="text-green-600 font-mono break-all text-xs">
                              {img.processedUrl}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Arquivo:</p>
                            <p className="text-gray-700 font-mono text-xs">
                              {img.fileName}
                            </p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado final */}
          {!isProcessing && logs.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {processedImages.length} imagens processadas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {logs.filter(l => l.level === 'error').length} erros
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
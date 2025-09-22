import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Info, Loader2, X, Eye, Download, Trash2 } from 'lucide-react';
import { Product } from '@/types/database';

interface VtexImage {
  id: string;
  skuId: string;
  skuName: string;
  skuColor: string | null;
  url: string;
  isPrimary: boolean;
  position: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface ProcessedProduct {
  id: number;
  name: string;
  anymarketId: string;
  totalImages: number;
  processedImages: number;
  lastProcessedImages: number;
}

interface CropImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  originalImages?: any[];
  onProcessingComplete?: (productId: number, result: any) => void;
}

export function CropImagesModal({ isOpen, onClose, product, originalImages, onProcessingComplete }: CropImagesModalProps) {
  
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
  const checkIfProductProcessed = useCallback(async (productId: number) => {
    if (!productId) return;
    
    setIsCheckingProcessed(true);
    try {
      const response = await fetch(`/api/processed-products?productId=${productId}`);
      const result = await response.json();
      
      if (result.success && result.data.isProcessed) {
        setProcessedProduct(result.data.processedProduct);
        addLog('info', '✅ Produto já foi processado anteriormente', result.data);
      } else {
        setProcessedProduct(null);
        addLog('info', 'ℹ️ Produto ainda não foi processado');
      }
    } catch (error: any) {
      addLog('warning', '⚠️ Erro ao verificar status do produto', { error: error.message });
    } finally {
      setIsCheckingProcessed(false);
    }
  }, [addLog]);

  // Estados para processamento
  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar se produto foi processado quando modal abre
  useEffect(() => {
    if (isOpen && product?.id) {
      checkIfProductProcessed(product.id);
    }
  }, [isOpen, product?.id, checkIfProductProcessed]);

  // Função para buscar logs de crop
  const fetchCropLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch('/api/crop-logs');
      const result = await response.json();
      
      if (result.success) {
        setCropLogs(result.logs || []);
        addLog('info', `📋 ${result.logs?.length || 0} logs de crop encontrados`);
      } else {
        addLog('warning', '⚠️ Erro ao buscar logs de crop', result.message);
      }
    } catch (error: any) {
      addLog('error', '❌ Erro ao buscar logs de crop', { error: error.message });
    } finally {
      setLoadingLogs(false);
    }
  }, [addLog]);

  // Função para obter cor do badge baseado no nível do log
  const getLogBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Função para obter ícone baseado no nível do log
  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (!isOpen || !product) {
    return null;
  }

  const handleProcessImages = async () => {
    if (!product) return;

    setIsProcessing(true);
    clearLogs();
    
    const startTime = Date.now();
    
    addLog('info', '🚀 Iniciando processamento completo de imagens...', {
      productId: product.id,
      anymarketId: product.anymarket_id
    });

    if (!product.anymarket_id) {
      addLog('error', '❌ Produto sem anymarketId - não é possível processar imagens');
      setIsProcessing(false);
      return;
    }

    try {
      // ETAPA 1: Deletar imagens existentes do Anymarket
      setCurrentStep('Etapa 1: Deletando imagens existentes do Anymarket...');
      addLog('info', '🗑️ ETAPA 1: Deletando imagens existentes do Anymarket...');

      try {
        // Buscar imagens existentes
        addLog('info', '🔍 Buscando imagens existentes no Anymarket...');
          
        const existingImagesResponse = await fetch('/api/anymarket/fetch-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ anymarketId: product.anymarket_id })
        });

        if (existingImagesResponse.ok) {
          const response = await existingImagesResponse.json();
          const existingImages = response.data?.images || [];
          
          addLog('info', `📊 Encontradas ${existingImages.length} imagens existentes no Anymarket`);

          if (existingImages.length > 0) {
            // Deletar cada imagem existente
            let deletedCount = 0;
            let deleteErrorCount = 0;

            for (let i = 0; i < existingImages.length; i++) {
              const image = existingImages[i];
              setCurrentStep(`Deletando imagem ${i + 1}/${existingImages.length}...`);
              
              try {
                addLog('info', `🗑️ Deletando imagem ${i + 1}: ID ${image.id}`);

                const deleteResponse = await fetch('/api/anymarket/delete-image', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    anymarketId: product.anymarket_id,
                    imageId: image.id
                  })
                });

                if (deleteResponse.ok) {
                  const result = await deleteResponse.json();
                  if (result.success) {
                    addLog('success', `✅ Imagem ${image.id} deletada com sucesso`);
                    deletedCount++;
                  } else {
                    addLog('warning', `⚠️ Erro ao deletar imagem ${image.id}: ${result.message}`);
                    deleteErrorCount++;
                  }
                } else {
                  const errorResult = await deleteResponse.json();
                  addLog('warning', `⚠️ Erro ao deletar imagem ${image.id}: ${errorResult.message || deleteResponse.status}`);
                  deleteErrorCount++;
                }
              } catch (error: any) {
                addLog('warning', `⚠️ Erro ao deletar imagem ${image.id}: ${error.message}`);
                deleteErrorCount++;
              }
            }

            addLog('info', `✅ Deleção concluída: ${deletedCount} deletadas, ${deleteErrorCount} erros`);
          } else {
            addLog('info', 'ℹ️ Nenhuma imagem existente para deletar');
          }
        } else {
          addLog('warning', '⚠️ Erro ao buscar imagens existentes do Anymarket');
        }
      } catch (error: any) {
        addLog('error', `❌ Erro na ETAPA 1: ${error.message}`);
      }

      // ETAPA 2: Buscar imagens da VTEX
      setCurrentStep('Etapa 2: Buscando imagens da VTEX...');
      addLog('info', '🔍 ETAPA 2: Buscando imagens da VTEX...');

      try {
        const vtexImagesResponse = await fetch('/api/crop-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            productId: product.id, 
            anymarketId: product.anymarket_id 
          })
        });

        if (vtexImagesResponse.ok) {
          const vtexResponse = await vtexImagesResponse.json();
          const vtexImages = vtexResponse.data?.images || [];
          
          addLog('success', `✅ Encontradas ${vtexImages.length} imagens da VTEX`);
          
          if (vtexImages.length === 0) {
            addLog('error', '❌ Nenhuma imagem da VTEX encontrada');
            setIsProcessing(false);
            return;
          }

          // ETAPA 3: Processar imagens com Pixian
          setCurrentStep('Etapa 3: Processando imagens com Pixian...');
          addLog('info', '🎨 ETAPA 3: Processando imagens com Pixian...');

          const processedImages = [];
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < vtexImages.length; i++) {
            const vtexImage = vtexImages[i];
            setCurrentStep(`Processando imagem ${i + 1}/${vtexImages.length} com Pixian...`);
            
            try {
              addLog('info', `🎨 Processando imagem ${i + 1}: ${vtexImage.url}`);

              // Dados para o Pixian
              const pixianData = {
                image: {
                  url: vtexImage.url
                },
                background: {
                  color: "#FFFFFF"
                },
                result: {
                  crop_to_foreground: true,
                  target_size: "1500 1500",
                  vertical_alignment: "middle",
                  margin: "0px 150px 0px 150px"
                },
                output: {
                  format: "jpeg",
                  jpeg_quality: 90
                }
              };

              const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(pixianData)
              });

              if (pixianResponse.ok) {
                const croppedImageBuffer = await pixianResponse.arrayBuffer();
                const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');
                
                processedImages.push({
                  vtexImageId: vtexImage.id,
                  skuId: vtexImage.skuId,
                  skuName: vtexImage.skuName,
                  originalUrl: vtexImage.url,
                  croppedBase64: croppedImageBase64,
                  fileName: `${product.anymarket_id}_vtex_${vtexImage.id}.jpg`,
                  success: true
                });
                
                addLog('success', `✅ Imagem ${i + 1} processada com sucesso no Pixian`);
                successCount++;
              } else {
                const errorText = await pixianResponse.text();
                addLog('error', `❌ Erro no Pixian para imagem ${i + 1}: ${pixianResponse.status} - ${errorText}`);
                errorCount++;
              }
            } catch (error: any) {
              addLog('error', `❌ Erro ao processar imagem ${i + 1}: ${error.message}`);
              errorCount++;
            }

            // Pausa entre processamentos
            if (i < vtexImages.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          addLog('info', `✅ Processamento Pixian concluído: ${successCount} sucessos, ${errorCount} erros`);

          if (processedImages.length === 0) {
            addLog('error', '❌ Nenhuma imagem foi processada com sucesso');
            setIsProcessing(false);
            return;
          }

          // ETAPA 4: Enviar imagens para o Anymarket
          setCurrentStep('Etapa 4: Enviando imagens para o Anymarket...');
          addLog('info', '📤 ETAPA 4: Enviando imagens para o Anymarket...');

          let uploadedCount = 0;
          let uploadErrorCount = 0;

          for (let i = 0; i < processedImages.length; i++) {
            const processedImage = processedImages[i];
            setCurrentStep(`Enviando imagem ${i + 1}/${processedImages.length} para Anymarket...`);
            
            try {
              addLog('info', `📤 Enviando imagem ${i + 1} para o servidor...`);

              // Usar endpoint interno para salvar imagem
              const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  imageData: `data:image/jpeg;base64,${processedImage.croppedBase64}`,
                  fileName: processedImage.fileName
                })
              });

              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                const newImageUrl = uploadResult.data.publicUrl;
                
                addLog('info', `📤 Enviando imagem ${i + 1} para Anymarket...`);

                // Enviar para Anymarket usando endpoint interno
                const anymarketUploadResponse = await fetch('/api/anymarket/upload-image', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    anymarketId: product.anymarket_id,
                    imageUrl: newImageUrl,
                    index: i + 1, // Anymarket começa do 1
                    main: i === 0 // Primeira imagem é principal
                  })
                });

                if (anymarketUploadResponse.ok) {
                  const result = await anymarketUploadResponse.json();
                  if (result.success) {
                    addLog('success', `✅ Imagem ${i + 1} enviada para Anymarket com sucesso`);
                    if (result.data?.imagemCropadaUpdated) {
                      addLog('info', `📅 Campo imagem_cropada atualizado na tabela anymarket`);
                    }
                    uploadedCount++;
                  } else {
                    addLog('error', `❌ Erro ao enviar imagem ${i + 1} para Anymarket: ${result.message}`);
                    uploadErrorCount++;
                  }
                } else {
                  const errorResult = await anymarketUploadResponse.json();
                  addLog('error', `❌ Erro ao enviar imagem ${i + 1} para Anymarket: ${errorResult.message || anymarketUploadResponse.status}`);
                  uploadErrorCount++;
                }
              } else {
                const errorResult = await uploadResponse.json();
                addLog('error', `❌ Erro ao salvar imagem ${i + 1} no servidor: ${errorResult.message || uploadResponse.status}`);
                uploadErrorCount++;
              }
            } catch (error: any) {
              addLog('error', `❌ Erro ao enviar imagem ${i + 1}: ${error.message}`);
              uploadErrorCount++;
            }
          }

          addLog('info', `✅ Upload concluído: ${uploadedCount} enviadas, ${uploadErrorCount} erros`);

          // Mostrar resultado final
          setProcessedImages(processedImages);
          
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          addLog('success', `🎉 Processamento completo finalizado em ${totalTime}s!`);
          addLog('info', `📊 Resumo: ${uploadedCount} imagens enviadas para o Anymarket`);

        } else {
          addLog('error', '❌ Erro ao buscar imagens da VTEX');
        }
      } catch (error: any) {
        addLog('error', `❌ Erro na ETAPA 2: ${error.message}`);
      }

    } catch (error: any) {
      console.error('❌ Erro geral no processamento:', error);
      addLog('error', `❌ Erro geral: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🖼️ Crop de Imagens</span>
            {product && (
              <Badge variant="outline" className="ml-2">
                {product.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Produto */}
          {product && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ID:</span> {product.id}
                  </div>
                  <div>
                    <span className="font-medium">Anymarket ID:</span> {product.anymarket_id || 'N/A'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Nome:</span> {product.name}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status do Processamento */}
          {currentStep && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">{currentStep}</span>
                  </div>
                  {progress.total > 0 && (
                    <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              onClick={handleProcessImages}
              disabled={isProcessing || !product?.anymarket_id}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                '🚀 Processar Imagens'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={clearLogs}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Logs
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchCropLogs}
              disabled={loadingLogs}
            >
              {loadingLogs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Logs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                📋 Logs de Processamento
                <Badge variant="outline">{logs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full overflow-y-auto">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Nenhum log ainda. Clique em &quot;Processar Imagens&quot; para começar.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getLogIcon(log.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${getLogBadgeColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{log.message}</p>
                          {log.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer">
                                Ver detalhes
                              </summary>
                              <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded overflow-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imagens Processadas */}
          {processedImages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  🖼️ Imagens Processadas ({processedImages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {processedImages.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Image
                          src={`data:image/jpeg;base64,${image.croppedBase64}`}
                          alt={`Processed ${index + 1}`}
                          width={200}
                          height={200}
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>SKU: {image.skuName}</div>
                        <div>Arquivo: {image.fileName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

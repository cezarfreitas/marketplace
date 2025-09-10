'use client';

import { useState } from 'react';
import { X, Download, Loader2, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

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

interface ProcessedImage {
  original: {
    url: string;
    base64: string;
    size: number;
  };
  cropped: {
    base64: string;
    size: number;
  };
}

export function CropImagesModal({ isOpen, onClose, product, originalImages }: CropImagesModalProps) {
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [processedImages, setProcessedImages] = useState<Map<string, ProcessedImage>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
    currentImage: ''
  });
  const [result, setResult] = useState<any>(null);

  if (!isOpen || !product) {
    // Limpar resultado quando modal é fechado
    if (result) {
      setResult(null);
    }
    return null;
  }

  const handleProcessImage = async (imageId: string, imageUrl: string) => {
    setProcessingImages(prev => new Set(prev).add(imageId));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(imageId);
      return newErrors;
    });

    try {
      console.log('🖼️ Processando imagem individual:', imageUrl);
      
      const response = await fetch('/api/test-pixian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl,
          testParams: {
            'background.color': '#FFFFFF',
            'result.crop_to_foreground': 'true',
            'result.target_size': '1500 1500',
            'result.vertical_alignment': 'middle',
            'output.format': 'jpeg',
            'output.jpeg_quality': '90',
            'result.margin': '0px 150px 0px 150px'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setProcessedImages(prev => new Map(prev).set(imageId, {
          original: {
            url: imageUrl,
            base64: '',
            size: 0
          },
          cropped: {
            base64: result.data.processedImage,
            size: result.data.processedSize
          }
        }));
        console.log('✅ Imagem processada com sucesso');
      } else {
        setErrors(prev => new Map(prev).set(imageId, result.message));
        console.error('❌ Erro ao processar imagem:', result.message);
      }
    } catch (error: any) {
      setErrors(prev => new Map(prev).set(imageId, error.message));
      console.error('❌ Erro ao processar imagem:', error);
    } finally {
      setProcessingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleDownloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessAllImages = async () => {
    if (!product) return;

    setIsProcessingAll(true);
    setProcessingProgress({
      current: 0,
      total: originalImages.length,
      currentImage: 'Iniciando processamento...'
    });

    try {
      console.log('🚀 Iniciando processamento completo de imagens...');
      
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

      const result = await response.json();

      if (result.success) {
        console.log('✅ Processo concluído:', result.data);
        setResult(result);
        
        // Atualizar o estado com os resultados processados
        if (result.data.results) {
          result.data.results.forEach((processedImage: any) => {
            setProcessedImages(prev => new Map(prev).set(processedImage.imageId, {
              original: {
                url: processedImage.originalImage || '',
                base64: '',
                size: 0
              },
              cropped: {
                base64: processedImage.cropped_base64 || '',
                size: processedImage.cropped_size || 0
              }
            }));
          });
        }

        // Adicionar erros se houver
        if (result.data.errors) {
          result.data.errors.forEach((error: any) => {
            setErrors(prev => new Map(prev).set(error.imageId, error.error));
          });
        }

        setProcessingProgress({
          current: result.data.processed || 0,
          total: result.data.totalImages || originalImages.length,
          currentImage: 'Concluído'
        });
      } else {
        console.error('❌ Erro no processamento automático:', result);
        let errorMessage = result.message;
        
        if (result.debug) {
          errorMessage += `\n\nDebug:\n`;
          if (result.debug.totalImages !== undefined) {
            errorMessage += `- Total de imagens: ${result.debug.totalImages}\n`;
          }
          if (result.debug.hasImages !== undefined) {
            errorMessage += `- Tem imagens: ${result.debug.hasImages}\n`;
          }
          if (result.debug.hasOriginalImages !== undefined) {
            errorMessage += `- Tem originalImage: ${result.debug.hasOriginalImages}\n`;
          }
          if (result.debug.imageStructure) {
            errorMessage += `- Estrutura das imagens:\n`;
            result.debug.imageStructure.forEach((img: any, index: number) => {
              errorMessage += `  ${index + 1}. ID: ${img.id}, originalImage: ${img.hasOriginalImage}, url: ${img.hasUrl}\n`;
            });
          }
        }
        
        alert(`Erro no processamento:\n\n${errorMessage}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar imagens:', error);
      alert(`Erro ao processar imagens: ${error.message}`);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🖼️ Crop de Imagens - {product.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              ID Anymarket: {product.anymarket_id} • {originalImages.length} imagens encontradas
            </p>
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              🎨 Pixian.ai: 1500x1500px • Fundo branco • Margem 150px • Qualidade 90%
            </div>
          </div>
          <button
            onClick={() => {
              setResult(null);
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Botão para processar */}
          <div className="mb-6">
            <button
              onClick={handleProcessAllImages}
              disabled={isProcessingAll || processingImages.size > 0}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 text-lg font-medium"
            >
              {isProcessingAll ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
              {isProcessingAll ? 'Processando...' : 'Deletar e Processar no Pixian'}
            </button>
            
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="font-medium mb-2">🎨 Processo Completo com Rate Limiting:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Deletar todas as imagens do produto no Anymarket</li>
                <li>Listar URLs das imagens dos SKUs da VTEX</li>
                <li>Processar imagens no Pixian (3 por vez, com delay de 5s)</li>
                <li>Aplicar backoff automático em caso de rate limit</li>
                <li>Exibir imagens originais e cropadas lado a lado</li>
              </ol>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>⏳ Rate Limiting:</strong> Processamento otimizado para respeitar os limites da API do Pixian
              </div>
            </div>
          </div>
          
          {/* Barra de progresso */}
          {isProcessingAll && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Processando imagens...</span>
                <span>{processingProgress.current}/{processingProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                ></div>
              </div>
              {processingProgress.currentImage && (
                <p className="text-sm text-gray-500 mt-1">{processingProgress.currentImage}</p>
              )}
            </div>
          )}

          {/* Grid de imagens */}
          {originalImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma imagem encontrada</h3>
              <p className="text-gray-600 mb-4">
                Este produto não possui imagens originais no Anymarket.
              </p>
              <p className="text-sm text-gray-500">
                Você ainda pode usar o botão "Processar Imagens da VTEX" para buscar e processar imagens diretamente da VTEX.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {originalImages.map((image) => {
              const isProcessing = processingImages.has(image.id);
              const processed = processedImages.get(image.id);
              const error = errors.get(image.id);

              return (
                <div key={image.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {/* Header da imagem */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {image.variation} {image.isMain && <span className="text-green-600">(Principal)</span>}
                      </h3>
                      <p className="text-sm text-gray-500">Imagem #{image.index}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
                      {processed && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {error && <AlertCircle className="h-4 w-4 text-red-600" />}
                    </div>
                  </div>

                  {/* Imagem original */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Original:</p>
                    <div className="relative">
                      <img
                        src={image.originalImage}
                        alt={`${image.variation} - Original`}
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.png';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Original
                      </div>
                    </div>
                  </div>

                  {/* Imagem cropada */}
                  {processed && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Cropada:</p>
                      <div className="relative">
                        <img
                          src={processed.cropped.base64}
                          alt={`${image.variation} - Cropada`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          Cropada
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    {!processed && !isProcessing && !error && (
                      <button
                        onClick={() => handleProcessImage(image.id, image.originalImage)}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Cropar
                      </button>
                    )}

                    {processed && (
                      <button
                        onClick={() => handleDownloadImage(processed.cropped.base64, `${product.name}-${image.variation}-cropada.png`)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </button>
                    )}

                    {error && (
                      <button
                        onClick={() => handleProcessImage(image.id, image.originalImage)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>

                  {/* Informações de tamanho */}
                  {processed && (
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Original: {formatFileSize(processed.original.size)}</p>
                      <p>Cropada: {formatFileSize(processed.cropped.size)}</p>
                    </div>
                  )}

                  {/* Status de upload */}
                  {processed && (
                    <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs font-medium text-green-800 mb-1">✅ Upload automático:</p>
                      <p className="text-xs text-green-700">
                        Imagem processada e enviada automaticamente para o Anymarket
                      </p>
                    </div>
                  )}

                  {/* Mensagem de erro */}
                  {error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Seção de URLs dos SKUs */}
        {result && result.data && result.data.skuImages && result.data.skuImages.images && result.data.skuImages.images.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🎨 Imagens Processadas no Pixian ({result.data.skuImages.processed}/{result.data.skuImages.total})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {result.data.skuImages.images.map((image: any, index: number) => (
                <div key={image.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900">
                        SKU: {image.sku_name} {image.sku_color && `(${image.sku_color})`}
                      </span>
                      {image.is_primary && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Principal
                        </span>
                      )}
                      {image.processing_success ? (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          ✅ Processada
                        </span>
                      ) : (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          ❌ Erro
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">Posição: {image.position}</span>
                  </div>

                  {image.processing_success ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Imagem Original */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Imagem Original:</label>
                        <div className="relative">
                          <img
                            src={image.full_url}
                            alt={`${image.sku_name} - Original`}
                            className="w-full h-32 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            Original
                          </div>
                        </div>
                        <div className="mt-2">
                          <input
                            type="text"
                            value={image.full_url}
                            readOnly
                            className="w-full text-xs p-2 bg-gray-100 border rounded font-mono"
                          />
                        </div>
                      </div>

                      {/* Imagem Cropada */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Imagem Cropada:</label>
                        <div className="relative">
                          <img
                            src={image.cropped_base64}
                            alt={`${image.sku_name} - Cropada`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                            Cropada
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = image.cropped_base64;
                              link.download = `${image.sku_name}-cropada.jpg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            📥 Baixar
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(image.cropped_base64)}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            📋 Copiar Base64
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">
                        <strong>Erro no processamento:</strong> {image.error || 'Erro desconhecido'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>{processedImages.size} de {originalImages.length} imagens processadas</span>
              {errors.size > 0 && (
                <span className="text-red-600">{errors.size} com erro</span>
              )}
              {isProcessingAll && (
                <span className="text-purple-600">Processamento automático em andamento...</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Fechar
            </button>
            {processedImages.size > 0 && (
              <button
                onClick={() => {
                  // Baixar todas as imagens cropadas
                  processedImages.forEach((processed, imageId) => {
                    const image = originalImages.find(img => img.id === imageId);
                    if (image) {
                      handleDownloadImage(processed.cropped.base64, `${product.name}-${image.variation}-cropada.png`);
                    }
                  });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Todas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

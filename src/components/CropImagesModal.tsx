'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  X, Download, Loader2, Image as ImageIcon, CheckCircle, AlertCircle, 
  Play, Pause, RotateCcw, Eye, EyeOff, Filter, Settings, 
  Zap, Clock, FileImage, Upload, Trash2, RefreshCw
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
    currentImage: '',
    stage: '',
    details: ''
  });
  const [result, setResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compare'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processed' | 'pending' | 'error'>('all');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState({
    startTime: 0,
    endTime: 0,
    totalTime: 0,
    successCount: 0,
    errorCount: 0
  });

  // Funções auxiliares
  const getFilteredImages = useCallback(() => {
    return originalImages.filter(image => {
      const processed = processedImages.has(image.id);
      const error = errors.has(image.id);
      
      switch (filterStatus) {
        case 'processed': return processed;
        case 'pending': return !processed && !error;
        case 'error': return error;
        default: return true;
      }
    });
  }, [originalImages, processedImages, errors, filterStatus]);

  const getImageStatus = useCallback((imageId: string) => {
    if (processingImages.has(imageId)) return 'processing';
    if (processedImages.has(imageId)) return 'processed';
    if (errors.has(imageId)) return 'error';
    return 'pending';
  }, [processingImages, processedImages, errors]);

  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  }, []);

  const handleSelectImage = useCallback((imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const filtered = getFilteredImages();
    if (selectedImages.size === filtered.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filtered.map(img => img.id)));
    }
  }, [getFilteredImages, selectedImages.size]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setProcessingStats({
        startTime: 0,
        endTime: 0,
        totalTime: 0,
        successCount: 0,
        errorCount: 0
      });
      setSelectedImages(new Set());
      setShowImagePreview(null);
    }
  }, [isOpen]);

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

    const startTime = Date.now();
    setIsProcessingAll(true);
    setProcessingStats(prev => ({ ...prev, startTime }));
    setProcessingProgress({
      current: 0,
      total: originalImages.length,
      currentImage: 'Iniciando processamento...',
      stage: 'Preparando',
      details: 'Conectando com a API do Pixian.ai'
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
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;

      if (result.success) {
        console.log('✅ Processo concluído:', result.data);
        setResult(result);
        
        // Atualizar estatísticas
        setProcessingStats(prev => ({
          ...prev,
          endTime,
          totalTime,
          successCount: result.data.successfulUploads || 0,
          errorCount: result.data.totalErrors || 0
        }));
        
        // Atualizar o estado com os resultados processados
        if (result.data.anymarketImages?.results) {
          result.data.anymarketImages.results.forEach((processedImage: any) => {
            setProcessedImages(prev => new Map(prev).set(processedImage.imageId, {
              original: {
                url: processedImage.originalUrl || '',
                base64: '',
                size: 0
              },
              cropped: {
                base64: processedImage.croppedBase64 || '',
                size: processedImage.croppedSize || 0
              }
            }));
          });
        }

        // Adicionar erros se houver
        if (result.data.anymarketImages?.errorDetails) {
          result.data.anymarketImages.errorDetails.forEach((error: any) => {
            setErrors(prev => new Map(prev).set(error.imageId, error.error));
          });
        }

        setProcessingProgress({
          current: result.data.totalProcessed || 0,
          total: result.data.totalImages || originalImages.length,
          currentImage: 'Concluído com sucesso!',
          stage: 'Finalizado',
          details: `${result.data.successfulUploads || 0} imagens processadas, ${result.data.totalErrors || 0} erros`
        });
      } else {
        console.error('❌ Erro no processamento automático:', result);
        setProcessingStats(prev => ({
          ...prev,
          endTime,
          totalTime,
          errorCount: 1
        }));
        
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
        
        setProcessingProgress({
          current: 0,
          total: originalImages.length,
          currentImage: 'Erro no processamento',
          stage: 'Erro',
          details: errorMessage
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar imagens:', error);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      setProcessingStats(prev => ({
        ...prev,
        endTime,
        totalTime,
        errorCount: 1
      }));
      
      setProcessingProgress({
        current: 0,
        total: originalImages.length,
        currentImage: 'Erro de conexão',
        stage: 'Erro',
        details: error.message
      });
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

  const filteredImages = getFilteredImages();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Crop de Imagens</h2>
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
                  {originalImages.length} imagens
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Pixian.ai
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Configurações"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  onClose();
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas ({originalImages.length})</option>
                  <option value="pending">Pendentes ({originalImages.length - processedImages.size - errors.size})</option>
                  <option value="processed">Processadas ({processedImages.size})</option>
                  <option value="error">Com Erro ({errors.size})</option>
                </select>
              </div>

              {/* Modo de visualização */}
              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-300">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grade"
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Lista"
                >
                  <div className="w-4 h-4 flex flex-col gap-0.5">
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('compare')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'compare' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Comparar"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>

              {/* Seleção */}
              {filteredImages.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedImages.size === filteredImages.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                  {selectedImages.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedImages.size} selecionadas
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {processedImages.size}
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {errors.size}
                </span>
                {processingStats.totalTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {formatTime(processingStats.totalTime)}
                  </span>
                )}
              </div>

              {/* Botão principal */}
              <button
                onClick={handleProcessAllImages}
                disabled={isProcessingAll || processingImages.size > 0}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg"
              >
                {isProcessingAll ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                {isProcessingAll ? 'Processando...' : 'Processar Todas'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          
          {/* Barra de progresso melhorada */}
          {isProcessingAll && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{processingProgress.stage}</h3>
                    <p className="text-sm text-gray-600">{processingProgress.currentImage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {processingProgress.current}/{processingProgress.total}
                  </div>
                  <div className="text-sm text-gray-500">
                    {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                ></div>
              </div>
              
              {processingProgress.details && (
                <div className="text-sm text-gray-600 bg-white/50 rounded-lg p-3">
                  <p>{processingProgress.details}</p>
                </div>
              )}
            </div>
          )}

          {/* Estatísticas de processamento */}
          {processingStats.totalTime > 0 && !isProcessingAll && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">{processingStats.successCount}</div>
                    <div className="text-sm text-green-600">Sucessos</div>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-700">{processingStats.errorCount}</div>
                    <div className="text-sm text-red-600">Erros</div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{formatTime(processingStats.totalTime)}</div>
                    <div className="text-sm text-blue-600">Tempo Total</div>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-purple-700">
                      {processingStats.totalTime > 0 ? Math.round(processingStats.successCount / processingStats.totalTime * 60) : 0}
                    </div>
                    <div className="text-sm text-purple-600">Imgs/min</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualização das imagens */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {originalImages.length === 0 ? 'Nenhuma imagem encontrada' : 'Nenhuma imagem corresponde ao filtro'}
              </h3>
              <p className="text-gray-600 mb-4">
                {originalImages.length === 0 
                  ? 'Este produto não possui imagens originais no Anymarket.'
                  : 'Tente alterar o filtro para ver mais imagens.'
                }
              </p>
              {originalImages.length === 0 && (
                <p className="text-sm text-gray-500">
                  Você ainda pode usar o botão "Processar Imagens da VTEX" para buscar e processar imagens diretamente da VTEX.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Modo Grade */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredImages.map((image) => {
                    const status = getImageStatus(image.id);
                    const processed = processedImages.get(image.id);
                    const error = errors.get(image.id);
                    const isSelected = selectedImages.has(image.id);

                    return (
                      <div 
                        key={image.id} 
                        className={`bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                          isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                        } ${status === 'error' ? 'border-red-200' : status === 'processed' ? 'border-green-200' : ''}`}
                      >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectImage(image.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <h3 className="font-semibold text-gray-900 text-sm">
                                {image.variation}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1">
                              {image.isMain && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  Principal
                                </span>
                              )}
                              <span className="text-xs text-gray-500">#{image.index}</span>
                            </div>
                          </div>
                          
                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {status === 'processing' && (
                              <div className="flex items-center gap-1 text-purple-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs font-medium">Processando</span>
                              </div>
                            )}
                            {status === 'processed' && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">Processada</span>
                              </div>
                            )}
                            {status === 'error' && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">Erro</span>
                              </div>
                            )}
                            {status === 'pending' && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs font-medium">Pendente</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Imagem */}
                        <div className="p-4">
                          <div className="relative group">
                            <img
                              src={image.originalImage}
                              alt={`${image.variation} - Original`}
                              className="w-full h-40 object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <button
                                onClick={() => setShowImagePreview(image.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 text-gray-900 p-2 rounded-full hover:bg-white"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Original
                            </div>
                          </div>

                          {/* Imagem cropada */}
                          {processed && (
                            <div className="mt-3">
                              <div className="relative">
                                <img
                                  src={processed.cropped.base64}
                                  alt={`${image.variation} - Cropada`}
                                  className="w-full h-40 object-cover rounded-lg border border-green-200"
                                />
                                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                  Cropada
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Ações */}
                          <div className="mt-4 flex gap-2">
                            {status === 'pending' && (
                              <button
                                onClick={() => handleProcessImage(image.id, image.originalImage)}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 font-medium"
                              >
                                <Zap className="h-4 w-4" />
                                Processar
                              </button>
                            )}

                            {status === 'processed' && (
                              <button
                                onClick={() => handleDownloadImage(processed.cropped.base64, `${product.name}-${image.variation}-cropada.png`)}
                                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Baixar
                              </button>
                            )}

                            {status === 'error' && (
                              <button
                                onClick={() => handleProcessImage(image.id, image.originalImage)}
                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Tentar Novamente
                              </button>
                            )}
                          </div>

                          {/* Informações */}
                          {processed && (
                            <div className="mt-3 text-xs text-gray-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Original:</span>
                                <span>{formatFileSize(processed.original.size)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cropada:</span>
                                <span>{formatFileSize(processed.cropped.size)}</span>
                              </div>
                            </div>
                          )}

                          {/* Erro */}
                          {error && (
                            <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                              {error}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modo Lista */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {filteredImages.map((image) => {
                    const status = getImageStatus(image.id);
                    const processed = processedImages.get(image.id);
                    const error = errors.get(image.id);
                    const isSelected = selectedImages.has(image.id);

                    return (
                      <div 
                        key={image.id} 
                        className={`bg-white rounded-lg border-2 transition-all duration-200 ${
                          isSelected ? 'border-blue-500' : 'border-gray-200'
                        } ${status === 'error' ? 'border-red-200' : status === 'processed' ? 'border-green-200' : ''}`}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectImage(image.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          
                          <div className="w-20 h-20 flex-shrink-0">
                            <img
                              src={image.originalImage}
                              alt={`${image.variation} - Original`}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {image.variation}
                              </h3>
                              {image.isMain && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  Principal
                                </span>
                              )}
                              <span className="text-xs text-gray-500">#{image.index}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {status === 'processing' && (
                                <div className="flex items-center gap-1 text-purple-600">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Processando</span>
                                </div>
                              )}
                              {status === 'processed' && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Processada</span>
                                </div>
                              )}
                              {status === 'error' && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Erro</span>
                                </div>
                              )}
                              {status === 'pending' && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-4 w-4" />
                                  <span>Pendente</span>
                                </div>
                              )}
                              
                              {processed && (
                                <span className="text-gray-500">
                                  {formatFileSize(processed.cropped.size)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {status === 'pending' && (
                              <button
                                onClick={() => handleProcessImage(image.id, image.originalImage)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
                              >
                                <Zap className="h-4 w-4" />
                                Processar
                              </button>
                            )}

                            {status === 'processed' && (
                              <button
                                onClick={() => handleDownloadImage(processed.cropped.base64, `${product.name}-${image.variation}-cropada.png`)}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Baixar
                              </button>
                            )}

                            {status === 'error' && (
                              <button
                                onClick={() => handleProcessImage(image.id, image.originalImage)}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Tentar Novamente
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{processedImages.size} processadas</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{errors.size} com erro</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{originalImages.length - processedImages.size - errors.size} pendentes</span>
              </div>
              {isProcessingAll && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {selectedImages.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedImages.size} selecionadas
                  </span>
                  <button
                    onClick={() => {
                      selectedImages.forEach(imageId => {
                        const image = originalImages.find(img => img.id === imageId);
                        const processed = processedImages.get(imageId);
                        if (image && processed) {
                          handleDownloadImage(processed.cropped.base64, `${product.name}-${image.variation}-cropada.png`);
                        }
                      });
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Selecionadas
                  </button>
                </div>
              )}
              
              {processedImages.size > 0 && (
                <button
                  onClick={() => {
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
              
              <button
                onClick={() => {
                  setResult(null);
                  onClose();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

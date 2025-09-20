'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Image, Check, Camera, AlertCircle, RotateCcw, Copy, Package, Tag, Calendar, Clock, Zap, Brain, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    id_produto_vtex: number;
    name: string;
    category_vtex_id?: number;
  } | null;
  onAnalysisComplete?: (productId: number) => void;
}

export function ImageAnalysisModal({ isOpen, onClose, product, onAnalysisComplete }: ImageAnalysisModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [loadingExistingAnalysis, setLoadingExistingAnalysis] = useState(false);

  // Função para gerar nova análise
  const handleGenerateAnalysis = async () => {
    if (!product) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: product.id_produto_vtex,
          forceNewAnalysis: true,
          categoryVtexId: product.category_vtex_id
        }),
      });

      const result = await response.json();

      if (result.success) {
        // A API retorna os dados diretamente, não em result.data
        console.log('✅ Análise concluída com sucesso:', result);
        console.log('📊 Dados da análise:', {
          analysis: result.analysis,
          image_count: result.analysis?.image_count,
          total_images: result.analysis?.total_images,
          images: result.images
        });
        setAnalysisData(result);
        // Notificar que a análise foi concluída para atualizar o estado do produto
        if (onAnalysisComplete && product) {
          console.log('🔄 Atualizando estado do produto:', product.id);
          onAnalysisComplete(product.id);
        }
      } else {
        setError(result.message || 'Erro ao analisar imagens');
      }
    } catch (error) {
      console.error('Erro ao analisar imagens:', error);
      setError(`Erro de conexão: ${(error as Error).message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Carregar análise existente e detalhes do produto quando o modal abrir
  useEffect(() => {
    if (isOpen && product) {
      loadProductDetails();
      loadExistingAnalysis();
    }
  }, [isOpen, product]);

  // Função para carregar detalhes do produto
  const loadProductDetails = async () => {
    if (!product) return;

    setLoadingProductDetails(true);
    try {
      const response = await fetch(`/api/products/${product.id_produto_vtex}/details`);
      const result = await response.json();

      console.log('🔍 Dados do produto carregados:', result);

      if (result.success && result.data) {
        console.log('📸 Imagens encontradas:', result.data.images);
        console.log('📊 Estatísticas:', result.data.stats);
        setProductDetails(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do produto:', error);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  // Função para carregar análise existente
  const loadExistingAnalysis = async () => {
    if (!product) return;

    setLoadingExistingAnalysis(true);
    try {
      const response = await fetch(`/api/analyze-images?productId=${product.id_produto_vtex}`);
      const result = await response.json();

      console.log('🔍 Carregando análise existente:', result);

      if (result.success && result.data) {
        // Transformar os dados para o formato esperado pelo modal
        const analysisData = {
          analysis: result.data.analysis,
          description: result.data.description,
          characteristics: result.data.characteristics,
          images: result.data.imagesAnalyzed || [],
          product: {
            id: result.data.productId,
            name: result.data.productName,
            title: result.data.productTitle
          }
        };
        
        console.log('✅ Análise existente carregada:', analysisData);
        setAnalysisData(analysisData);
      } else {
        console.log('⚠️ Nenhuma análise existente encontrada');
        setAnalysisData(null);
      }
    } catch (error) {
      console.error('Erro ao carregar análise existente:', error);
      setAnalysisData(null);
    } finally {
      setLoadingExistingAnalysis(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Análise de Imagens com IA</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Botão de Análise/Regenerar */}
            {!analysisData ? (
              <Button
                onClick={handleGenerateAnalysis}
                disabled={analyzing}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Analisar Imagens</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleGenerateAnalysis}
                disabled={analyzing}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Regenerar</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                setAnalysisData(null);
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Loading Overlay - Centralizado no modal inteiro */}
        {analyzing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Analisando Imagens</h3>
                    <p className="text-sm text-gray-600">Processando com inteligência artificial...</p>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content - Layout Horizontal */}
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Esquerda - Produto e Análise */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6 relative">
                
                {/* Error State */}
                {error && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800 font-medium text-sm">{error}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}


                {/* Galeria de Imagens */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <Image className="w-4 h-4" />
                      <span>Galeria de Imagens</span>
                      {productDetails?.images && (
                        <Badge variant="outline" className="text-xs">
                          {productDetails.images.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {productDetails?.images && productDetails.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {productDetails.images.slice(0, 4).map((image: any, index: number) => {
                          // Tentar diferentes propriedades para a URL da imagem
                          const imageUrl = image.file_url || image.url || image.src || image;
                          console.log(`🖼️ Imagem ${index + 1}:`, { image, imageUrl });
                          
                          return (
                            <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Imagem ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                              onError={(e) => {
                                console.error(`❌ Erro ao carregar imagem ${index + 1}:`, imageUrl);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                              onLoad={() => {
                                console.log(`✅ Imagem ${index + 1} carregada com sucesso:`, imageUrl);
                              }}
                            />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Image className="w-6 h-6 text-white" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma imagem encontrada</p>
                        {productDetails && (
                          <p className="text-xs text-gray-400 mt-1">
                            Debug: {JSON.stringify(productDetails.images)}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>

          {/* Coluna Direita - Resultado da Análise */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6">
                {/* Título da Seção */}
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Resultado da Análise</h3>
                </div>

                {loadingExistingAnalysis ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                          Carregando Análise
                        </h3>
                        <p className="text-gray-600 text-xs">
                          Buscando análise existente...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : analysisData ? (
                  <>
                    {/* Analysis Status */}
                    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-800 text-sm">Análise Concluída</h3>
                            <div className="flex items-center space-x-3 text-xs text-green-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date().toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Image className="w-3 h-3" />
                                <span>{analysisData.analysis?.image_count || analysisData.analysis?.total_images || 0} imagens analisadas</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Main Analysis */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span>Análise Técnica</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 rounded-lg border-l-4 border-purple-500 max-h-80 overflow-y-auto">
                          <div className="p-4">
                            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                              {analysisData.analysis?.contextual_analysis || analysisData.description || 'Análise não disponível'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Characteristics */}
                    {analysisData.characteristics && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center space-x-2 text-sm">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span>Características Identificadas</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-gray-50 rounded-lg border-l-4 border-green-500 max-h-64 overflow-y-auto">
                            <div className="p-4">
                              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                {analysisData.characteristics}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          const description = analysisData.analysis?.contextual_analysis || analysisData.description || '';
                          const characteristics = analysisData.characteristics || '';
                          const fullText = description + (characteristics ? '\n\n' + characteristics : '');
                          navigator.clipboard.writeText(fullText);
                        }}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar Análise</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Estado Inicial - Sem Análise */
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Brain className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Aguardando Análise
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Clique no botão &quot;Analisar Imagens&quot; na coluna esquerda para gerar a análise com IA.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                          <p className="text-gray-500 text-sm">
                            A análise aparecerá aqui após ser processada pela inteligência artificial.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
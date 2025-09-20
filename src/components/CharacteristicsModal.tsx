'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Copy, RefreshCw, List, Check, AlertCircle, Hash, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface CharacteristicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    id_produto_vtex: number;
    name: string;
    title?: string;
    description?: string;
    brand_name?: string;
    category_name?: string;
    ref_produto?: string;
  };
  onCharacteristicsGenerated?: (productId: number, characteristics: any[]) => void;
}

export function CharacteristicsModal({ isOpen, onClose, product, onCharacteristicsGenerated }: CharacteristicsModalProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedCharacteristics, setGeneratedCharacteristics] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [loadingExistingCharacteristics, setLoadingExistingCharacteristics] = useState(false);
  const [availableCharacteristics, setAvailableCharacteristics] = useState<any[]>([]);
  const [loadingCharacteristics, setLoadingCharacteristics] = useState(false);
  const [characteristicsStats, setCharacteristicsStats] = useState<{
    characteristicsCount: number;
    generationTime: number | null;
  }>({
    characteristicsCount: 0,
    generationTime: null
  });

  // Função para carregar detalhes do produto
  const loadProductDetails = useCallback(async () => {
    if (!product) {
      console.log('⚠️ Product não disponível para carregar detalhes');
      return;
    }

    console.log('🔍 Carregando detalhes do produto ID:', product.id_produto_vtex);
    console.log('🔍 URL da API:', `/api/products/${product.id_produto_vtex}/details`);
    
    setLoadingProductDetails(true);
    try {
      const response = await fetch(`/api/products/${product.id_produto_vtex}/details`);
      console.log('📡 Status da resposta:', response.status);
      console.log('📡 Response OK:', response.ok);
      
      const result = await response.json();
      console.log('📊 Resposta completa da API detalhes:', JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        setProductDetails(result.data);
        console.log('✅ Detalhes do produto carregados:', result.data);
        console.log('✅ ID da categoria:', result.data.id_category_vtex);
        
        // Carregar características disponíveis após carregar os detalhes
        if (result.data.id_category_vtex) {
          console.log('🔄 Carregando características para categoria:', result.data.id_category_vtex);
          loadAvailableCharacteristics(result.data.id_category_vtex);
        } else {
          console.log('⚠️ ID da categoria não encontrado nos detalhes');
        }
      } else {
        console.log('❌ Erro na resposta da API:', result.message);
        setProductDetails(null);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes do produto:', error);
      setProductDetails(null);
    } finally {
      setLoadingProductDetails(false);
    }
  }, [product]);

  // Função para buscar características existentes
  const loadExistingCharacteristics = useCallback(async () => {
    if (!product) return;

    setLoadingExistingCharacteristics(true);
    try {
      const response = await fetch(`/api/respostas-caracteristicas?productId=${product.id_produto_vtex}`);
      const result = await response.json();

      console.log('🔍 Carregando características existentes:', result);

      if (result.success && result.data && result.data.length > 0) {
        const existingCharacteristics = result.data;
        console.log('✅ Características existentes encontradas:', existingCharacteristics.length);
        
        setGeneratedCharacteristics(existingCharacteristics);
        setCharacteristicsStats(prev => ({
          ...prev,
          characteristicsCount: existingCharacteristics.length
        }));
      } else {
        console.log('⚠️ Nenhuma característica existente encontrada');
        setGeneratedCharacteristics(null);
      }
    } catch (error) {
      console.error('Erro ao buscar características existentes:', error);
      setGeneratedCharacteristics(null);
    } finally {
      setLoadingExistingCharacteristics(false);
    }
  }, [product]);

  // Carregar detalhes do produto quando o modal abrir
  useEffect(() => {
    if (isOpen && product) {
      loadProductDetails();
      loadExistingCharacteristics(); // Buscar características existentes
      setGeneratedCharacteristics(null);
      setError(null);
    }
  }, [isOpen, product, loadProductDetails, loadExistingCharacteristics]);

  // Função para carregar características disponíveis para a categoria
  const loadAvailableCharacteristics = async (categoryId?: number) => {
    const targetCategoryId = categoryId || productDetails?.id_category_vtex;
    
    if (!targetCategoryId) {
      console.log('⚠️ ID da categoria não disponível:', { categoryId, productDetails });
      return;
    }

    console.log('🔍 Carregando características para categoria ID:', targetCategoryId);
    console.log('🔍 URL da API:', `/api/caracteristicas-by-category?categoryId=${targetCategoryId}`);
    
    setLoadingCharacteristics(true);
    try {
      const response = await fetch(`/api/caracteristicas-by-category?categoryId=${targetCategoryId}`);
      console.log('📡 Status da resposta:', response.status);
      console.log('📡 Headers da resposta:', response.headers);
      
      const result = await response.json();
      console.log('📊 Resposta completa da API características:', JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        setAvailableCharacteristics(result.data);
        console.log('✅ Características disponíveis para categoria:', result.data.length);
        console.log('📋 Características encontradas:', result.data.map((c: any) => c.caracteristica));
      } else {
        console.log('⚠️ Nenhuma característica encontrada ou erro na API:', result.message);
        setAvailableCharacteristics([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar características disponíveis:', error);
      setAvailableCharacteristics([]);
    } finally {
      setLoadingCharacteristics(false);
    }
  };

  // Função para gerar características
  const handleGenerateCharacteristics = async (forceRegenerate = false) => {
    if (!product) return;

    // Se não for regeneração forçada e já existem características, não gerar novas
    if (!forceRegenerate && generatedCharacteristics) {
      console.log('✅ Características já existem, não gerando novas');
      return;
    }

    const startTime = Date.now();
    setGenerating(true);
    setError(null);
    setCharacteristicsStats(prev => ({ ...prev, generationTime: null }));

    try {
      const response = await fetch('/api/generate-characteristics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id_produto_vtex,
          forceRegenerate: forceRegenerate
        }),
      });

      const result = await response.json();
      const generationTime = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Características geradas com sucesso:', result.data);
        
        // Recarregar características existentes do banco
        await loadExistingCharacteristics();
        
        // Atualizar estatísticas
        setCharacteristicsStats(prev => ({
          ...prev,
          characteristicsCount: result.data.characteristicsGenerated || 0,
          generationTime: generationTime
        }));

        if (onCharacteristicsGenerated) {
          onCharacteristicsGenerated(product.id_produto_vtex, result.data);
        }
      } else {
        setError(result.message || 'Erro ao gerar características');
      }
    } catch (error) {
      console.error('Erro ao gerar características:', error);
      setError(`Erro de conexão: ${(error as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Função para copiar características
  const handleCopyCharacteristics = async () => {
    if (!generatedCharacteristics) return;

    try {
      const characteristicsText = generatedCharacteristics
        .map(char => `${char.caracteristica}: ${char.resposta}`)
        .join('\n');
      
      await navigator.clipboard.writeText(characteristicsText);
      console.log('✅ Características copiadas para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar características:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <List className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Geração de Características com IA</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
              {product.ref_produto && (
                <p className="text-xs text-gray-500 mt-1">REF: {product.ref_produto}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Botão de Gerar/Regenerar Características */}
            {!generatedCharacteristics ? (
              <Button
                onClick={() => handleGenerateCharacteristics(false)}
                disabled={generating}
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    <span>Gerar Características</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleGenerateCharacteristics(true)}
                disabled={generating}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerar</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                setGeneratedCharacteristics(null);
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Loading Overlay - Centralizado no modal inteiro */}
        {generating && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Gerando Características</h3>
                    <p className="text-sm text-gray-600">Analisando produto e gerando características otimizadas...</p>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content - Layout Horizontal */}
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Esquerda - Características Disponíveis */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6 relative">

                {/* Available Characteristics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <List className="w-4 h-4" />
                      <span>Características Disponíveis</span>
                      {availableCharacteristics.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {availableCharacteristics.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loadingCharacteristics ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-5/6" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ) : availableCharacteristics.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {availableCharacteristics.map((char, index) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 rounded p-2 hover:shadow-sm transition-shadow">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0">
                                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-xs">
                                    {index + 1}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-gray-900 text-xs">{char.caracteristica}</h4>
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {char.is_active ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-1 leading-tight">{char.pergunta_ia}</p>
                                {char.valores_possiveis && (
                                  <div className="text-xs text-gray-500 bg-white rounded px-1 py-0.5 border">
                                    <span className="font-medium">Valores:</span> {char.valores_possiveis}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4 text-sm">
                        Nenhuma característica cadastrada para esta categoria.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Características Geradas */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6">
                {/* Error Message */}
                {error && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                          <h3 className="font-medium">Erro ao gerar características</h3>
                          <p className="text-sm text-red-500 mt-1">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Loading State for Existing Characteristics */}
                {loadingExistingCharacteristics && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Carregando Características</h3>
                          <p className="text-sm text-gray-600">Buscando características existentes...</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Characteristics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Check className="w-5 h-5" />
                      <span>Características Geradas</span>
                      {generatedCharacteristics && generatedCharacteristics.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {generatedCharacteristics.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {generatedCharacteristics && generatedCharacteristics.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {generatedCharacteristics.map((char, index) => (
                          <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-semibold text-xs">
                                    {index + 1}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {char.caracteristica}
                                  </Badge>
                                </div>
                                <p className="text-gray-800 font-medium text-sm leading-relaxed">
                                  {char.resposta}
                                </p>
                                {char.confianca && (
                                  <div className="mt-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500 font-medium">Confiança:</span>
                                      <Progress value={char.confianca} className="w-12 h-1.5" />
                                      <span className="text-xs text-gray-600 font-medium">{char.confianca}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !loadingExistingCharacteristics ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <List className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Aguardando Geração
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Use o botão &quot;Gerar Características&quot; no cabeçalho para gerar características otimizadas para este produto.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {generatedCharacteristics && generatedCharacteristics.length > 0 && (
                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={handleCopyCharacteristics}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

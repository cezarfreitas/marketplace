'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Copy, RefreshCw, FileText, Check, AlertCircle, Hash, Shield, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/modules/products';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onDescriptionGenerated?: (productId: number, description: string) => void;
}

export function DescriptionModal({ 
  isOpen, 
  onClose, 
  product, 
  onDescriptionGenerated 
}: DescriptionModalProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);

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
        console.log('✅ Imagens encontradas:', result.data.images?.length || 0);
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

  // Função para carregar descrição existente
  const loadExistingDescription = useCallback(async () => {
    if (!product) {
      console.log('⚠️ Product não disponível para carregar descrição');
      return;
    }

    console.log('🔍 Carregando descrição existente para produto ID:', product.id_produto_vtex);
    
    try {
      const response = await fetch(`/api/descriptions?productId=${product.id_produto_vtex}`);
      console.log('📡 Status da resposta descrição:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Resposta da API descrição:', result);

        if (result.success && result.data && result.data.length > 0) {
          const existingDescription = result.data[0];
          console.log('✅ Descrição existente encontrada:', existingDescription);
          
          // Limpar fences se aparecerem e adicionar título se necessário
          const cleanDescription = existingDescription.description
            .replace(/^```html\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
            
          // A limpeza de títulos é feita na API, não precisamos adicionar título aqui
          
          setGeneratedDescription(cleanDescription);
          console.log('✅ Descrição existente carregada no modal');
        } else {
          console.log('📝 Nenhuma descrição existente encontrada');
        }
      } else {
        console.log('❌ Erro ao carregar descrição existente:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar descrição existente:', error);
    }
  }, [product]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen && product) {
      loadProductDetails();
      loadExistingDescription(); // Carregar descrição existente se houver
      setError(null);
      setCopied(false);
      // Não resetar generatedDescription aqui, deixar que loadExistingDescription gerencie
    } else if (!isOpen) {
      // Reset states quando modal fecha
      setGeneratedDescription(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, product, loadProductDetails, loadExistingDescription]);

  const handleGenerateDescription = async (forceRegenerate = false) => {
    if (!product) return;

    // Se não for regeneração forçada e já existe descrição, não gerar nova
    if (!forceRegenerate && generatedDescription) {
      console.log('✅ Descrição já existe, não gerando nova');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log('🚀 Gerando descrição para produto:', product.id_produto_vtex);

      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id_produto_vtex,
          title: product.name,
          forceRegenerate: forceRegenerate
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Descrição gerada com sucesso:', data.data);
        
        // Limpar fences se aparecerem (a limpeza de títulos é feita na API)
        const cleanDescription = data.data.description
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
          
        setGeneratedDescription(cleanDescription);
        
        // Callback para atualizar o estado do produto
        if (onDescriptionGenerated) {
          onDescriptionGenerated(product.id_produto_vtex, cleanDescription);
        }
      } else {
        console.error('❌ Erro ao gerar descrição:', data.error);
        setError(data.error || 'Erro ao gerar descrição');
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyDescription = async () => {
    if (generatedDescription) {
      try {
        await navigator.clipboard.writeText(generatedDescription);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900">Geração de Descrição com IA</h2>
                {generatedDescription && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Descrição Gerada
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{product.name}</p>
              {product.ref_id && (
                <p className="text-xs text-gray-500 mt-1">REF: {product.ref_id}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Botão de Gerar Descrição */}
            {!generatedDescription && (
              <Button
                onClick={() => handleGenerateDescription(false)}
                disabled={generating}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Gerar Descrição</span>
                  </>
                )}
              </Button>
            )}
            {generatedDescription && (
              <Button
                onClick={() => handleGenerateDescription(true)}
                disabled={generating}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Regenerando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerar Descrição</span>
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                setGeneratedDescription(null);
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
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Gerando Descrição</h3>
                    <p className="text-sm text-gray-600">Analisando produto e gerando descrição otimizada...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content - Layout Horizontal */}
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Esquerda - Imagens e Descrição Original */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6 relative">
                {/* Product Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Imagens do Produto</span>
                      {productDetails?.images?.length > 0 && (
                        <span className="text-sm text-gray-500">({productDetails.images.length})</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingProductDetails ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(4)].map((_, index) => (
                          <Skeleton key={index} className="w-full h-32 rounded-lg" />
                        ))}
                      </div>
                    ) : productDetails?.images && productDetails.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {productDetails.images.slice(0, 4).map((image: any, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.file_url || image.file_location || image}
                              alt={`${product.name} - Imagem ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-image.svg';
                                target.alt = 'Imagem não disponível';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="bg-white bg-opacity-90 rounded-full p-2">
                                  <FileText className="w-4 h-4 text-gray-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {productDetails.images.length > 4 && (
                          <div className="relative group">
                            <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-400 mb-1">
                                  +{productDetails.images.length - 4}
                                </div>
                                <div className="text-xs text-gray-500">
                                  mais imagens
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8 text-sm">
                        Nenhuma imagem disponível para este produto.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Original Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Descrição Original</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.description ? (
                      <div 
                        className="text-sm leading-relaxed text-gray-700 space-y-2 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: product.description
                            .replace(/<b>/g, '<strong class="font-semibold text-gray-900">')
                            .replace(/<\/b>/g, '</strong>')
                            .replace(/<ul>/g, '<ul class="list-disc pl-6 space-y-1">')
                            .replace(/<li>/g, '<li class="text-gray-700">')
                            .replace(/<br>/g, '<br class="block my-2">')
                        }}
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-4 text-sm">
                        Nenhuma descrição original disponível para este produto.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Descrição Gerada */}
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
                          <h3 className="font-medium">Erro ao gerar descrição</h3>
                          <p className="text-sm text-red-500 mt-1">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Check className="w-5 h-5" />
                      <span>Descrição Gerada</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {generatedDescription ? (
                      <div 
                        className="text-sm leading-relaxed text-gray-700 space-y-2 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: generatedDescription
                            .replace(/<b>/g, '<strong class="font-semibold text-gray-900">')
                            .replace(/<\/b>/g, '</strong>')
                            .replace(/<ul>/g, '<ul class="list-disc pl-6 space-y-1">')
                            .replace(/<li>/g, '<li class="text-gray-700">')
                            .replace(/<br>/g, '<br class="block my-2">')
                        }}
                      />
                    ) : !generating ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Aguardando Geração
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Use o botão &quot;Gerar Descrição&quot; no cabeçalho para gerar uma descrição otimizada para este produto.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {generatedDescription && (
                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={handleCopyDescription}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
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

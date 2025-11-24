'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Copy, RefreshCw, FileText, Check, AlertCircle, Hash, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Product } from '@/modules/products';

interface TitleGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onTitleGenerated?: (productId: number, title: string) => void;
}

export function TitleGenerationModal({ isOpen, onClose, product, onTitleGenerated }: TitleGenerationModalProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [originalTitle, setOriginalTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [loadingExistingTitle, setLoadingExistingTitle] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [savingManualTitle, setSavingManualTitle] = useState(false);
  const [titleStats, setTitleStats] = useState<{
    characterCount: number;
    isUnique: boolean | null;
    checkingUniqueness: boolean;
    generationTime: number | null;
  }>({
    characterCount: 0,
    isUnique: null,
    checkingUniqueness: false,
    generationTime: null
  });

  // Carregar detalhes do produto quando o modal abrir
  useEffect(() => {
    if (isOpen && product) {
      loadProductDetails();
      loadExistingTitle(); // Buscar título existente
      setOriginalTitle(product.title || null);
      setGeneratedTitle(null);
      setError(null);
      setRetryCount(0);
      setShowManualInput(false);
      setManualTitle('');
    }
  }, [isOpen, product]);

  // Função para carregar detalhes do produto
  const loadProductDetails = async () => {
    if (!product) return;

    setLoadingProductDetails(true);
    try {
      const response = await fetch(`/api/products/${product.id_produto_vtex}/details`);
      const result = await response.json();

      if (result.success && result.data) {
        setProductDetails(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do produto:', error);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  // Função para buscar título existente
  const loadExistingTitle = async () => {
    if (!product) return;

    setLoadingExistingTitle(true);
    try {
      const response = await fetch(`/api/titles?productId=${product.id_produto_vtex}&status=validated`);
      const result = await response.json();

      console.log('🔍 Carregando título existente:', result);

      if (result.success && result.data && result.data.length > 0) {
        const existingTitle = result.data[0];
        console.log('✅ Título existente encontrado:', existingTitle.title);
        
        setGeneratedTitle(existingTitle.title);
        setTitleStats(prev => ({
          ...prev,
          characterCount: existingTitle.title.length,
          isUnique: true // Se existe na tabela, é considerado único
        }));

        // Verificar unicidade do título existente
        const isUnique = await checkTitleUniqueness(existingTitle.title);
        setTitleStats(prev => ({ ...prev, isUnique }));
      } else {
        console.log('⚠️ Nenhum título existente encontrado');
        setGeneratedTitle(null);
      }
    } catch (error) {
      console.error('Erro ao buscar título existente:', error);
      setGeneratedTitle(null);
    } finally {
      setLoadingExistingTitle(false);
    }
  };

  // Função para verificar unicidade do título
  const checkTitleUniqueness = async (title: string) => {
    if (!product) return false;
    
    setTitleStats(prev => ({ ...prev, checkingUniqueness: true }));
    
    try {
      // Usar API correta de verificação de unicidade
      const response = await fetch('/api/check-title-uniqueness', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          productId: product.id_produto_vtex
        }),
      });

      const result = await response.json();
      console.log('🔍 DEBUG Unicidade:', result);
      console.log('🔍 isUnique value:', result.isUnique);
      console.log('🔍 typeof isUnique:', typeof result.isUnique);
      
      if (result.success) {
        const isUnique = result.isUnique === true;
        console.log('🔍 Final isUnique:', isUnique);
        return isUnique;
      } else {
        console.error('Erro na verificação de unicidade:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Erro ao verificar unicidade:', error);
      return null;
    } finally {
      setTitleStats(prev => ({ ...prev, checkingUniqueness: false }));
    }
  };

  // Função para gerar título com retry automático
  const handleGenerateTitle = async (forceRegenerate = false) => {
    if (!product) return;

    // Se não for regeneração forçada e já existe um título, não gerar novo
    if (!forceRegenerate && generatedTitle) {
      console.log('✅ Título já existe, não gerando novo');
      return;
    }

    const startTime = Date.now();
    setGenerating(true);
    setError(null);
    setTitleStats(prev => ({ ...prev, isUnique: null, generationTime: null }));

    let currentRetry = 0;
    const maxRetries = 10;
    let lastError = '';

    while (currentRetry < maxRetries) {
      try {
        console.log(`🔄 Tentativa ${currentRetry + 1}/${maxRetries} de gerar título...`);
        
        const response = await fetch('/api/generate-title', {
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
          const newTitle = result.data.title;
          setGeneratedTitle(newTitle);
          
          // Atualizar estatísticas
          setTitleStats(prev => ({
            ...prev,
            characterCount: newTitle.length,
            generationTime: generationTime
          }));

          // Verificar unicidade
          const isUnique = await checkTitleUniqueness(newTitle);
          setTitleStats(prev => ({ ...prev, isUnique }));

          if (onTitleGenerated) {
            onTitleGenerated(product.id_produto_vtex, newTitle);
          }
          
          // Sucesso! Resetar contadores e sair
          setRetryCount(0);
          setGenerating(false);
          return;
        } else {
          lastError = result.message || 'Erro ao gerar título';
          console.warn(`⚠️ Tentativa ${currentRetry + 1} falhou:`, lastError);
        }
      } catch (error) {
        lastError = `Erro de conexão: ${(error as Error).message}`;
        console.error(`❌ Tentativa ${currentRetry + 1} falhou:`, error);
      }

      currentRetry++;
      setRetryCount(currentRetry);

      // Se não atingiu o limite, aguardar antes de tentar novamente
      if (currentRetry < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos entre tentativas
      }
    }

    // Se chegou aqui, todas as 10 tentativas falharam
    setGenerating(false);
    setError(`Não foi possível gerar o título após ${maxRetries} tentativas. ${lastError}`);
    setShowManualInput(true); // Mostrar input manual
  };

  // Função para salvar título manual
  const handleSaveManualTitle = async () => {
    if (!product || !manualTitle.trim()) {
      setError('Por favor, insira um título válido');
      return;
    }

    setSavingManualTitle(true);
    setError(null);

    try {
      const response = await fetch('/api/titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id_produto_vtex,
          title: manualTitle.trim(),
          status: 'validated'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedTitle(manualTitle.trim());
        setShowManualInput(false);
        setManualTitle('');
        setRetryCount(0);
        
        // Atualizar estatísticas
        setTitleStats(prev => ({
          ...prev,
          characterCount: manualTitle.trim().length
        }));

        // Verificar unicidade
        const isUnique = await checkTitleUniqueness(manualTitle.trim());
        setTitleStats(prev => ({ ...prev, isUnique }));

        if (onTitleGenerated) {
          onTitleGenerated(product.id_produto_vtex, manualTitle.trim());
        }
      } else {
        setError(result.message || 'Erro ao salvar título manual');
      }
    } catch (error) {
      console.error('Erro ao salvar título manual:', error);
      setError(`Erro ao salvar: ${(error as Error).message}`);
    } finally {
      setSavingManualTitle(false);
    }
  };

  // Função para copiar título
  const handleCopyTitle = () => {
    if (generatedTitle) {
      navigator.clipboard.writeText(generatedTitle);
      // Aqui você pode adicionar uma notificação de sucesso
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Geração de Título com IA</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
              {product.ref_produto && (
                <p className="text-xs text-gray-500 mt-1">REF: {product.ref_produto}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Botão de Gerar/Regenerar Título */}
            {!generatedTitle ? (
              <Button
                onClick={() => handleGenerateTitle(false)}
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
                    <span>Gerar Título</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleGenerateTitle(true)}
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
                setGeneratedTitle(null);
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
                    <h3 className="text-lg font-semibold text-gray-900">Gerando Título</h3>
                    <p className="text-sm text-gray-600">Analisando produto e gerando título otimizado...</p>
                    {retryCount > 0 && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        Tentativa {retryCount}/10
                      </p>
                    )}
                  </div>
                  <Progress value={(retryCount / 10) * 100 || 75} className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content - Layout de uma coluna */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error State */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-red-800 font-medium text-sm">{error}</p>
                      {retryCount > 0 && (
                        <p className="text-red-600 text-xs mt-1">
                          Tentativas realizadas: {retryCount}/10
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual Title Input - Aparece após 10 falhas */}
            {showManualInput && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Inserir Título Manualmente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Como a geração automática falhou, você pode inserir o título manualmente abaixo:
                  </p>
                  <div className="space-y-3">
                    <textarea
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Digite o título do produto..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      disabled={savingManualTitle}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {manualTitle.length} caracteres
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            setShowManualInput(false);
                            setManualTitle('');
                            setRetryCount(0);
                          }}
                          variant="outline"
                          size="sm"
                          disabled={savingManualTitle}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSaveManualTitle}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={!manualTitle.trim() || savingManualTitle}
                        >
                          {savingManualTitle ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Salvar Título
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

                {loadingExistingTitle ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                          Carregando Título
                        </h3>
                        <p className="text-gray-600 text-xs">
                          Buscando título existente...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : generatedTitle ? (
                  <>
                    {/* Title Status */}
                    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-800 text-sm">Título Gerado</h3>
                            <div className="flex items-center space-x-3 text-xs text-green-600">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date().toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Nome Original */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span>Nome Original</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 rounded-lg border-l-4 border-gray-400 max-h-24 overflow-y-auto">
                          <div className="p-4">
                            <p className="text-gray-600 leading-relaxed text-sm">
                              {product.name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Original Title - só mostra se for diferente do título otimizado */}
                    {originalTitle && originalTitle !== generatedTitle && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center space-x-2 text-sm">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span>Título Original</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-gray-50 rounded-lg border-l-4 border-gray-400 max-h-24 overflow-y-auto">
                            <div className="p-4">
                              <p className="text-gray-600 leading-relaxed text-sm">
                                {originalTitle}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Generated Title */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>Título Otimizado</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <div className="p-4">
                            <p className="text-gray-700 leading-relaxed text-sm font-medium mb-3">
                              {generatedTitle}
                            </p>
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400 font-medium">REF:</span>
                                <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded border">
                                  {product.ref_produto || 'N/A'} - {product.id_produto_vtex}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Informações do título */}
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4">
                            {/* Contagem de caracteres */}
                            <div className="flex items-center space-x-1">
                              <Hash className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600">
                                {titleStats.characterCount} caracteres
                              </span>
                            </div>
                            
                            {/* Verificação de unicidade */}
                            <div className="flex items-center space-x-1">
                              {titleStats.checkingUniqueness ? (
                                <div className="flex items-center space-x-1">
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                  <span className="text-blue-600">Verificando...</span>
                                </div>
                              ) : titleStats.isUnique === true ? (
                                <div className="flex items-center space-x-1">
                                  <Check className="w-3 h-3 text-green-600" />
                                  <span className="text-green-600">Único</span>
                                </div>
                              ) : titleStats.isUnique === false ? (
                                <div className="flex items-center space-x-1">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  <span className="text-red-600">Duplicado</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-500">Não verificado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>


                    {/* Action Buttons */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleCopyTitle}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar Título</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Estado Inicial - Sem Título */
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Aguardando Geração
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Use o botão &quot;Gerar Título&quot; no cabeçalho para gerar um título otimizado para este produto.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}

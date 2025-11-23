'use client';

import { useState, useEffect } from 'react';
import { X, Search, RotateCcw, CheckCircle, AlertCircle, Clock, RefreshCw, Zap, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: number;
  name: string;
  ref_id?: string;
  anymarket_id?: string;
}

interface AnymarketSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSyncComplete?: (productId: number) => void;
}

interface AnymarketData {
  anymarket_id: string;
  product_name: string;
  timestamp: string;
  anymarket_data: any;
}

export function AnymarketSyncModal({ isOpen, onClose, product, onSyncComplete }: AnymarketSyncModalProps) {
  // Estados do modal - para recuperar dados e fazer PATCH
  const [anymarketData, setAnymarketData] = useState<AnymarketData | null>(null);
  const [loadingAnymarketData, setLoadingAnymarketData] = useState(false);
  const [patchResult, setPatchResult] = useState<any>(null);
  const [loadingPatch, setLoadingPatch] = useState(false);
  
  // Novos estados para atualização de título e preços
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'fetching' | 'updating' | 'completed'>('idle');
  const [errorStep, setErrorStep] = useState<'none' | 'fetching' | 'updating'>('none');
  const [sentJsonData, setSentJsonData] = useState<any>(null);

  // Limpar dados quando o modal fechar e carregar dados quando abrir
  useEffect(() => {
    if (!isOpen) {
      setAnymarketData(null);
      setPatchResult(null);
      setUpdateResult(null);
      setSentJsonData(null);
      setCurrentStep('idle');
      setErrorStep('none');
    } else if (product) {
      // Se o modal abriu e há um produto, verificar se já foi sincronizado
      // e carregar os dados automaticamente
      fetchAnymarketData();
    }
  }, [isOpen, product]);

  const fetchAnymarketData = async () => {
    if (!product) return null;

    setLoadingAnymarketData(true);
    setAnymarketData(null);
    setErrorStep('none');

    try {
      console.log('🔍 Buscando dados do produto no Anymarket...');
      console.log('📋 Produto:', { id: product.id, name: product.name, ref_id: product.ref_id });
      
      const response = await fetch('/api/anymarket/fetch-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id
        })
      });

      console.log('📡 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        setErrorStep('fetching');
        return null;
      }

      const result = await response.json();
      console.log('📊 Resultado da API:', result);
      
      if (result.success) {
        setAnymarketData(result.data);
        setCurrentStep('completed'); // Marcar como concluído quando dados são carregados
        console.log('✅ Dados do Anymarket carregados com sucesso!');
        console.log('🔍 Estrutura dos dados:', result.data);
        console.log('🔍 anymarket_id:', result.data?.anymarket_id);
        return result.data; // Retornar os dados obtidos
      } else {
        console.error('❌ Erro ao buscar dados:', result.message);
        setErrorStep('fetching');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      setErrorStep('fetching');
      return null;
    } finally {
      setLoadingAnymarketData(false);
    }
  };

  const performPatchRemoveCharacteristics = async () => {
    if (!product || !anymarketData) return;

    setLoadingPatch(true);
    setPatchResult(null);

    try {
      console.log('🔄 Iniciando PATCH para remover características...');
      
      const response = await fetch('/api/anymarket/patch-remove-characteristics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          anymarketId: anymarketData.anymarket_id
        })
      });

      console.log('📡 Resposta do PATCH:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        alert(`❌ Erro HTTP ${response.status}: ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log('📊 Resultado do PATCH:', result);
      
      if (result.success) {
        setPatchResult(result.data);
        console.log('✅ PATCH realizado com sucesso!');
      } else {
        console.error('❌ Erro no PATCH:', result.message);
        alert('❌ Erro no PATCH: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Erro ao fazer PATCH:', error);
      alert('❌ Erro ao fazer PATCH: ' + (error as Error).message);
    } finally {
      setLoadingPatch(false);
    }
  };

  const updateProductTitleAndPrices = async (anymarketDataToUse?: any) => {
    if (!product) return;

    setLoadingUpdate(true);
    setCurrentStep('updating');
    setUpdateResult(null);
    setErrorStep('none');

    // Usar anymarketData passado como parâmetro ou o estado atual
    const dataToUse = anymarketDataToUse || anymarketData;

    try {
      console.log('🔄 Iniciando atualização de título e preços...');
      console.log('📋 Dados sendo enviados:', {
        productId: product.id,
        anymarketId: dataToUse?.anymarket_id,
        anymarketIdType: typeof dataToUse?.anymarket_id
      });
      
      const response = await fetch('/api/anymarket/update-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          anymarketId: dataToUse?.anymarket_id
        })
      });

      console.log('📡 Resposta da atualização:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        setErrorStep('updating');
        setCurrentStep('idle');
        return;
      }

      const result = await response.json();
      console.log('📊 Resultado da atualização:', result);
      
      if (result.success) {
        setUpdateResult(result.data);
        // Armazenar o payload que foi enviado para o Anymarket
        setSentJsonData(result.data?.patch_payload || result.data?.payload || null);
        setCurrentStep('completed');
        console.log('✅ Atualização realizada com sucesso!');
        
        // Notificar que o sincronismo foi concluído
        if (onSyncComplete && product) {
          onSyncComplete(product.id);
        }
      } else {
        console.error('❌ Erro na atualização:', result.message);
        setErrorStep('updating');
        setCurrentStep('idle');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      setErrorStep('updating');
      setCurrentStep('idle');
    } finally {
      setLoadingUpdate(false);
    }
  };

  const startFullSync = async () => {
    if (!product) return;

    setCurrentStep('fetching');
    setAnymarketData(null);
    setUpdateResult(null);
    setPatchResult(null);
    setErrorStep('none'); // Limpar erros anteriores

    try {
      console.log('🔄 Iniciando processo direto: buscar e atualizar títulos...');
      
      // Buscar dados do Anymarket e aguardar o resultado
      const fetchedData = await fetchAnymarketData();
      
      // Atualizar título e preços diretamente passando os dados obtidos
      await updateProductTitleAndPrices(fetchedData);
      
    } catch (error) {
      console.error('❌ Erro no processo direto:', error);
      setCurrentStep('idle');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch (error) {
      return 'Data inválida';
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
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Sincronização Anymarketing</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
              {product.ref_id && (
                <p className="text-xs text-gray-500 mt-1">REF: {product.ref_id}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Botão de Sincronizar */}
            {currentStep === 'idle' && (
              <Button
                onClick={startFullSync}
                disabled={currentStep !== 'idle'}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Sincronizar</span>
              </Button>
            )}

            {/* Botão de Resincronizar (só aparece quando há dados) */}
            {anymarketData && currentStep === 'completed' && (
              <Button
                onClick={() => {
                  setCurrentStep('idle');
                  setUpdateResult(null);
                  setPatchResult(null);
                  setErrorStep('none');
                  startFullSync();
                }}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Resincronizar</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Loading Overlay - Centralizado no modal inteiro */}
        {(currentStep === 'fetching' || currentStep === 'updating') && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentStep === 'fetching' ? 'Buscando Dados' : 'Atualizando Produto'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {currentStep === 'fetching' 
                        ? 'Recuperando dados do Anymarketing...' 
                        : 'Sincronizando títulos, preços e características...'
                      }
                    </p>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content - Layout de uma coluna */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Estado Inicial - Só aparece se não há dados carregados */}
            {currentStep === 'idle' && errorStep === 'none' && !anymarketData && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Pronto para Sincronizar</h3>
                    <p className="text-gray-600 text-sm">
                      Clique no botão &quot;Sincronizar&quot; no cabeçalho para buscar dados do Anymarketing e atualizar o produto.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado de Carregamento - Quando está buscando dados automaticamente */}
            {currentStep === 'fetching' && !anymarketData && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Carregando Dados</h3>
                    <p className="text-gray-600 text-sm">
                      Buscando dados da sincronização anterior...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado de Erro */}
            {errorStep !== 'none' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {errorStep === 'fetching' ? 'Erro ao Buscar Dados' : 'Erro ao Atualizar'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-6">
                      {errorStep === 'fetching' 
                        ? 'Não foi possível recuperar os dados do Anymarketing. Verifique a conexão e tente novamente.'
                        : 'Não foi possível atualizar o produto. Verifique os dados e tente novamente.'
                      }
                    </p>
                    <Button
                      onClick={() => {
                        setCurrentStep('idle');
                        setErrorStep('none');
                        startFullSync();
                      }}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium mx-auto"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tentar Novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado de Sucesso */}
            {currentStep === 'completed' && (
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 text-sm">
                        {updateResult ? 'Sincronização Concluída' : 'Dados da Sincronização'}
                      </h3>
                      <p className="text-green-600 text-xs">
                        {updateResult 
                          ? 'Produto sincronizado com sucesso! Os dados foram atualizados no Anymarketing.'
                          : 'Dados da sincronização anterior carregados com sucesso.'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dados do Anymarket - Mostrar quando há dados carregados */}
            {anymarketData && currentStep === 'completed' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Search className="w-4 h-4 text-blue-600" />
                    <span>Dados do Anymarket</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 text-sm">
                            ID Anymarket: {anymarketData.anymarket_id}
                          </div>
                          <div className="text-gray-600 text-xs">
                            Produto: {anymarketData.product_name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Última atualização: {formatDate(anymarketData.timestamp)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                          📊 Dados
                        </Badge>
                      </div>
                    </div>
                    
                    {anymarketData.anymarket_data && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="font-medium text-blue-800 text-sm mb-2">
                          Informações do Produto
                        </div>
                        <div className="text-blue-600 text-xs space-y-1">
                          <div><strong>Título:</strong> {anymarketData.anymarket_data.title}</div>
                          <div><strong>Categoria:</strong> {anymarketData.anymarket_data.category?.name}</div>
                          <div><strong>Marca:</strong> {anymarketData.anymarket_data.brand?.name}</div>
                          <div><strong>Modelo:</strong> {anymarketData.anymarket_data.model}</div>
                          <div><strong>Status:</strong> {anymarketData.anymarket_data.isProductActive ? 'Ativo' : 'Inativo'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhes da Sincronização */}
            {updateResult && currentStep === 'completed' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Detalhes da Sincronização</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {updateResult.updates && updateResult.updates.map((update: any, index: number) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm break-words">
                              {update.field}: {update.oldValue} → {update.newValue}
                            </div>
                            <div className="text-gray-600 text-xs">
                              SKU: {update.skuTitle || 'Produto'}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                            ✅ Atualizado
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Características Enviadas */}
            {updateResult && updateResult.characteristics && updateResult.characteristics.length > 0 && currentStep === 'completed' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Hash className="w-4 h-4 text-blue-600" />
                    <span>Características Enviadas ({updateResult.characteristics_count})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {updateResult.characteristics.map((char: any, index: number) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-blue-800 text-sm">
                              {char.name}
                            </div>
                            <div className="text-blue-600 text-xs break-words">
                              {char.value}
                            </div>
                            {char.confidence && (
                              <div className="text-blue-500 text-xs mt-1">
                                Confiança: {Math.round(char.confidence * 100)}%
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                            📋 Característica
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* JSON Enviado para Anymarket */}
            {sentJsonData && currentStep === 'completed' && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Hash className="w-4 h-4 text-purple-600" />
                    <span>JSON Enviado para Anymarket</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(sentJsonData, null, 2)}
                    </pre>
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

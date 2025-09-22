'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Image, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause, 
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Tag,
  Sparkles,
  RefreshCw,
  Scissors
} from 'lucide-react';

interface BatchAnalysisResult {
  productId: number;
  productName: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
  steps: {
    imageAnalysis: { success: boolean; message: string; error?: string; duration?: number };
    titleGeneration: { success: boolean; message: string; error?: string; duration?: number };
    descriptionGeneration: { success: boolean; message: string; error?: string; duration?: number };
    characteristicsGeneration: { success: boolean; message: string; error?: string; duration?: number };
    anymarketSync: { success: boolean; message: string; error?: string; duration?: number };
    imageCrop: { success: boolean; message: string; error?: string; duration?: number };
  };
}

interface BatchAnalysisProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: number[];
  onComplete: (results: BatchAnalysisResult[]) => void;
}

export function BatchAnalysisProgressModal({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  onComplete 
}: BatchAnalysisProgressModalProps) {
  
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchAnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentProduct, setCurrentProduct] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [currentStepType, setCurrentStepType] = useState<'imageAnalysis' | 'titleGeneration' | 'descriptionGeneration' | 'characteristicsGeneration' | 'anymarketSync' | 'imageCrop' | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const successCount = results.filter(r => r.success && r.steps?.imageAnalysis?.success && r.steps?.titleGeneration?.success && r.steps?.descriptionGeneration?.success && r.steps?.characteristicsGeneration?.success && r.steps?.anymarketSync?.success && r.steps?.imageCrop?.success).length;
  const errorCount = results.filter(r => r.error || (r.steps?.imageAnalysis?.error) || (r.steps?.titleGeneration?.error) || (r.steps?.descriptionGeneration?.error) || (r.steps?.characteristicsGeneration?.error) || (r.steps?.anymarketSync?.error) || (r.steps?.imageCrop?.error)).length;
  const totalSteps = selectedProducts.length;

  const handleStartProcessing = async () => {
    if (selectedProducts.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setResults([]);
    setIsCompleted(false);
    setCurrentProductIndex(0);
    setCurrentProduct('');
    setCurrentStep('Preparando análise de imagens...');

    try {
      // Usar a API de análise de imagens em lote com streaming
      setCurrentStep('Iniciando análise de imagens em lote...');
      
      const response = await fetch('/api/analyze-images-batch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: selectedProducts,
          skipExisting: false
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Não foi possível obter o stream de resposta');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'init':
                  setResults(data.data.results);
                  setCurrentStep('Otimização iniciada');
                  setCurrentStepType(null);
                  break;
                  
                        case 'progress':
                          setCurrentProduct(data.data.currentProduct);
                          setCurrentProductIndex(data.data.currentIndex);
                          setResults(data.data.results);
                          setCurrentStepType(data.data.currentStep);
                          
                          if (data.data.currentStep === 'imageAnalysis') {
                            setCurrentStep(`Analisando imagens - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          } else if (data.data.currentStep === 'titleGeneration') {
                            setCurrentStep(`Gerando título - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          } else if (data.data.currentStep === 'descriptionGeneration') {
                            setCurrentStep(`Gerando descrição - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          } else if (data.data.currentStep === 'characteristicsGeneration') {
                            setCurrentStep(`Gerando características - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          } else if (data.data.currentStep === 'anymarketSync') {
                            setCurrentStep(`Sincronizando AnyMarket - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          } else if (data.data.currentStep === 'imageCrop') {
                            setCurrentStep(`Executando crop de imagens - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                          }
                          break;
                  
                case 'step_update':
                  setResults(data.data.results);
                  if (data.data.step === 'imageAnalysis') {
                    setCurrentStep(`Análise de imagem concluída - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  } else if (data.data.step === 'titleGeneration') {
                    setCurrentStep(`Título gerado - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  } else if (data.data.step === 'descriptionGeneration') {
                    setCurrentStep(`Descrição gerada - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  } else if (data.data.step === 'characteristicsGeneration') {
                    setCurrentStep(`Características geradas - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  } else if (data.data.step === 'anymarketSync') {
                    setCurrentStep(`Sincronização AnyMarket concluída - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  } else if (data.data.step === 'imageCrop') {
                    setCurrentStep(`Crop de imagens concluído - Produto ${data.data.currentIndex + 1}/${selectedProducts.length}`);
                  }
                  break;
                  
                case 'update':
                  setResults(data.data.results);
                  setCurrentStep(`Produto ${data.data.currentIndex + 1}/${selectedProducts.length} concluído`);
                  setCurrentStepType(null);
                  break;
                  
                case 'complete':
                  setResults(data.data.results);
                  setProgress(100);
                  setIsCompleted(true);
                  setCurrentStep('Otimização em lote concluída!');
                  setCurrentProduct('');
                  setCurrentStepType(null);
                  onComplete(data.data.results);
                  break;
                  
                case 'error':
                  throw new Error(data.data.error);
              }
            } catch (parseError) {
              console.warn('Erro ao parsear dados do stream:', parseError);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Erro na análise de imagens em lote:', error);
      setError(error.message);
      setCurrentStep('Erro na análise de imagens');
      setCurrentProduct('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      // Reset states
      setProgress(0);
      setCurrentProduct('');
      setCurrentStep('');
      setResults([]);
      setError(null);
      setIsCompleted(false);
      setCurrentProductIndex(0);
      setExpandedProduct(null);
    }
  };

  const getStatusIcon = (result: BatchAnalysisResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (result.error || (result.steps?.imageAnalysis?.error) || (result.steps?.titleGeneration?.error) || (result.steps?.descriptionGeneration?.error) || (result.steps?.characteristicsGeneration?.error)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (result.message.includes('Executando') || result.message.includes('Gerando') || 
               result.steps?.imageAnalysis?.message === 'Executando...' || 
               result.steps?.titleGeneration?.message === 'Executando...' ||
               result.steps?.descriptionGeneration?.message === 'Executando...' ||
               result.steps?.characteristicsGeneration?.message === 'Executando...') {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Componente para mostrar ícones de progresso
  const ProgressIcons = ({ result }: { result: BatchAnalysisResult }) => {
    const isProcessing = result.steps?.imageAnalysis?.message === 'Executando...' || 
                        result.steps?.titleGeneration?.message === 'Executando...' ||
                        result.steps?.descriptionGeneration?.message === 'Executando...' ||
                        result.steps?.characteristicsGeneration?.message === 'Executando...' ||
                        result.steps?.anymarketSync?.message === 'Executando...' ||
                        result.steps?.imageCrop?.message === 'Executando...';
    
    const currentStep = result.steps?.imageAnalysis?.message === 'Executando...' ? 'imageAnalysis' :
                       result.steps?.titleGeneration?.message === 'Executando...' ? 'titleGeneration' :
                       result.steps?.descriptionGeneration?.message === 'Executando...' ? 'descriptionGeneration' :
                       result.steps?.characteristicsGeneration?.message === 'Executando...' ? 'characteristicsGeneration' :
                       result.steps?.anymarketSync?.message === 'Executando...' ? 'anymarketSync' :
                       result.steps?.imageCrop?.message === 'Executando...' ? 'imageCrop' : null;

    return (
      <div className="flex items-center space-x-2">
        {/* Análise de Imagem */}
        <div className="flex flex-col items-center">
          {result.steps?.imageAnalysis?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.imageAnalysis?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'imageAnalysis' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Image className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">Imagem</span>
        </div>

        {/* Geração de Título */}
        <div className="flex flex-col items-center">
          {result.steps?.titleGeneration?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.titleGeneration?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'titleGeneration' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">Título</span>
        </div>

        {/* Geração de Descrição */}
        <div className="flex flex-col items-center">
          {result.steps?.descriptionGeneration?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.descriptionGeneration?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'descriptionGeneration' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Tag className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">Descrição</span>
        </div>

        {/* Geração de Características */}
        <div className="flex flex-col items-center">
          {result.steps?.characteristicsGeneration?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.characteristicsGeneration?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'characteristicsGeneration' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">Características</span>
        </div>

        {/* Sincronização AnyMarket */}
        <div className="flex flex-col items-center">
          {result.steps?.anymarketSync?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.anymarketSync?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'anymarketSync' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">AnyMarket</span>
        </div>

        {/* Crop de Imagens */}
        <div className="flex flex-col items-center">
          {result.steps?.imageCrop?.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result.steps?.imageCrop?.error ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : currentStep === 'imageCrop' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Scissors className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-600 mt-1">Crop</span>
        </div>
      </div>
    );
  };

  const getStatusBadge = (result: BatchAnalysisResult) => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>;
    } else if (result.error || (result.steps?.imageAnalysis?.error) || (result.steps?.titleGeneration?.error) || (result.steps?.descriptionGeneration?.error) || (result.steps?.characteristicsGeneration?.error) || (result.steps?.anymarketSync?.error) || (result.steps?.imageCrop?.error)) {
      return <Badge variant="destructive">Erro</Badge>;
    } else if (result.steps?.imageAnalysis?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Analisando Imagem</Badge>;
    } else if (result.steps?.titleGeneration?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Gerando Título</Badge>;
    } else if (result.steps?.descriptionGeneration?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Gerando Descrição</Badge>;
    } else if (result.steps?.characteristicsGeneration?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Gerando Características</Badge>;
    } else if (result.steps?.anymarketSync?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Sincronizando AnyMarket</Badge>;
    } else if (result.steps?.imageCrop?.message === 'Executando...') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Executando Crop</Badge>;
    } else if (result.message.includes('Executando') || result.message.includes('Gerando') || result.message.includes('Sincronizando')) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Processando</Badge>;
    } else {
      return <Badge variant="secondary">Aguardando</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isProcessing) {
        handleClose();
      }
    }}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="batch-analysis-description"
        onPointerDownOutside={(e) => {
          if (isProcessing) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isProcessing) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Otimização em Lote</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p 
                id="batch-analysis-description"
                className="text-gray-600 mt-1"
              >
                Análise de imagens, geração de títulos, descrições, características, sincronização AnyMarket e crop de imagens para {selectedProducts.length} produto(s) selecionado(s)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              {isProcessing ? <Pause className="w-4 h-4" /> : 'Fechar'}
            </Button>
          </div>

          {/* Informações do lote */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{selectedProducts.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sucessos</p>
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Erros</p>
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Progresso</p>
                <p className="text-2xl font-bold text-blue-600">{results.length}/{totalSteps}</p>
              </div>
            </div>
          </div>

          {/* Progresso geral */}
          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso Geral</span>
                <span className="text-sm text-gray-500">
                  {results.length > 0 ? `${results.filter(r => r.success || (r.steps?.imageAnalysis?.error) || (r.steps?.titleGeneration?.error) || (r.steps?.descriptionGeneration?.error) || (r.steps?.characteristicsGeneration?.error) || (r.steps?.anymarketSync?.error) || (r.steps?.imageCrop?.error)).length}/${totalSteps}` : '0'}/{totalSteps}
                </span>
              </div>
              <Progress 
                value={results.length > 0 ? (results.filter(r => r.success || (r.steps?.imageAnalysis?.error) || (r.steps?.titleGeneration?.error) || (r.steps?.descriptionGeneration?.error) || (r.steps?.characteristicsGeneration?.error) || (r.steps?.anymarketSync?.error) || (r.steps?.imageCrop?.error)).length / totalSteps) * 100 : 0} 
                className="w-full" 
              />
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Status:</strong> {currentStep}</p>
                {currentProduct && <p><strong>Produto atual:</strong> {currentProduct}</p>}
              </div>
            </div>
          )}

          {/* Botão de iniciar */}
          {!isProcessing && results.length === 0 && (
            <div className="text-center mb-6">
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartProcessing();
                }} 
                className="bg-blue-600 hover:bg-blue-700"
                type="button"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Otimização em Lote
              </Button>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erro na Análise</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Resultados</h3>
              
              {results.map((result, index) => {
            const isCompleted = result.success;
            const hasError = result.error || (result.steps?.imageAnalysis?.error) || (result.steps?.titleGeneration?.error) || (result.steps?.descriptionGeneration?.error) || (result.steps?.characteristicsGeneration?.error) || (result.steps?.anymarketSync?.error) || (result.steps?.imageCrop?.error);
            const isProcessing = result.message.includes('Executando') || result.message.includes('Gerando') || result.message.includes('Sincronizando') ||
                               result.steps?.imageAnalysis?.message === 'Executando...' ||
                               result.steps?.titleGeneration?.message === 'Executando...' ||
                               result.steps?.descriptionGeneration?.message === 'Executando...' ||
                               result.steps?.characteristicsGeneration?.message === 'Executando...' ||
                               result.steps?.anymarketSync?.message === 'Executando...' ||
                               result.steps?.imageCrop?.message === 'Executando...';
                const isWaiting = result.message === 'Aguardando processamento...';
                
                return (
                  <Card 
                    key={result.productId} 
                    className={`border-l-4 ${
                      result.success ? 'border-l-green-500' : 
                      hasError ? 'border-l-red-500' : 
                      isProcessing ? 'border-l-blue-500' : 
                      'border-l-gray-300'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(result)}
                          <div>
                            <CardTitle className="text-base">
                              {result.productName}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              ID: {result.productId} • {result.duration ? `${result.duration}ms` : 
                              isProcessing ? 'Processando...' : 
                              isWaiting ? 'Aguardando...' : 
                              hasError ? 'Erro' : 'Concluído'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <ProgressIcons result={result} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedProduct(
                              expandedProduct === result.productId ? null : result.productId
                            )}
                          >
                            {expandedProduct === result.productId ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedProduct === result.productId && (
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                          <p className="text-sm text-gray-700">
                            <strong>Status Geral:</strong> {result.message}
                          </p>
                          
                          {/* Etapas */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Análise de Imagem:</span>
                              <div className="flex items-center space-x-2">
                                {result.steps.imageAnalysis.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : result.steps.imageAnalysis.error ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : result.steps.imageAnalysis.message === 'Executando...' ? (
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-xs text-gray-600">
                                  {result.steps.imageAnalysis.duration ? `${result.steps.imageAnalysis.duration}ms` : ''}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 ml-4">
                              {result.steps.imageAnalysis.message}
                              {result.steps.imageAnalysis.error && (
                                <span className="text-red-600"> - {result.steps.imageAnalysis.error}</span>
                              )}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Geração de Título:</span>
                              <div className="flex items-center space-x-2">
                                {result.steps.titleGeneration.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : result.steps.titleGeneration.error ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : result.steps.titleGeneration.message === 'Executando...' ? (
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-xs text-gray-600">
                                  {result.steps.titleGeneration.duration ? `${result.steps.titleGeneration.duration}ms` : ''}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 ml-4">
                              {result.steps.titleGeneration.message}
                              {result.steps.titleGeneration.error && (
                                <span className="text-red-600"> - {result.steps.titleGeneration.error}</span>
                              )}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Geração de Descrição:</span>
                              <div className="flex items-center space-x-2">
                                {result.steps.descriptionGeneration.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : result.steps.descriptionGeneration.error ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : result.steps.descriptionGeneration.message === 'Executando...' ? (
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-xs text-gray-600">
                                  {result.steps.descriptionGeneration.duration ? `${result.steps.descriptionGeneration.duration}ms` : ''}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 ml-4">
                              {result.steps.descriptionGeneration.message}
                              {result.steps.descriptionGeneration.error && (
                                <span className="text-red-600"> - {result.steps.descriptionGeneration.error}</span>
                              )}
                            </p>
                            
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Geração de Características:</span>
                      <div className="flex items-center space-x-2">
                        {result.steps.characteristicsGeneration.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : result.steps.characteristicsGeneration.error ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : result.steps.characteristicsGeneration.message === 'Executando...' ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-gray-600">
                          {result.steps.characteristicsGeneration.duration ? `${result.steps.characteristicsGeneration.duration}ms` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 ml-4">
                      {result.steps.characteristicsGeneration.message}
                      {result.steps.characteristicsGeneration.error && (
                        <span className="text-red-600"> - {result.steps.characteristicsGeneration.error}</span>
                      )}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sincronização AnyMarket:</span>
                      <div className="flex items-center space-x-2">
                        {result.steps.anymarketSync.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : result.steps.anymarketSync.error ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : result.steps.anymarketSync.message === 'Executando...' ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-gray-600">
                          {result.steps.anymarketSync.duration ? `${result.steps.anymarketSync.duration}ms` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 ml-4">
                      {result.steps.anymarketSync.message}
                      {result.steps.anymarketSync.error && (
                        <span className="text-red-600"> - {result.steps.anymarketSync.error}</span>
                      )}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Crop de Imagens:</span>
                      <div className="flex items-center space-x-2">
                        {result.steps.imageCrop.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : result.steps.imageCrop.error ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : result.steps.imageCrop.message === 'Executando...' ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-gray-600">
                          {result.steps.imageCrop.duration ? `${result.steps.imageCrop.duration}ms` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 ml-4">
                      {result.steps.imageCrop.message}
                      {result.steps.imageCrop.error && (
                        <span className="text-red-600"> - {result.steps.imageCrop.error}</span>
                      )}
                    </p>
                          </div>
                          
                          {result.error && (
                            <p className="text-sm text-red-600">
                              <strong>Erro Geral:</strong> {result.error}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Botão de fechar quando concluído */}
          {isCompleted && (
            <div className="text-center mt-6">
              <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

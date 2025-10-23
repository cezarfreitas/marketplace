'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface AnymarketBatchSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: number[];
  onSyncComplete?: () => void;
}

interface SyncResult {
  productId: number;
  anymarketId?: string;
  productName?: string;
  success: boolean;
  title?: string;
  descriptionLength?: number;
  characteristicsCount?: number;
  skuUpdate?: any;
  message?: string;
  error?: string;
}

export function AnymarketBatchSyncModal({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  onSyncComplete 
}: AnymarketBatchSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [results, setResults] = useState<SyncResult[]>([]);
  const [error, setError] = useState<string>('');

  const handleSync = async () => {
    if (selectedProducts.length === 0) return;

    setIsLoading(true);
    setCurrentStep('syncing');
    setProgress(0);
    setResults([]);
    setError('');

    try {
      console.log('🔄 Iniciando sincronização em lote com Anymarket...');
      console.log('📋 Produtos selecionados:', selectedProducts);

      const response = await fetch('/api/anymarket/sync-batch-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: selectedProducts
        })
      });

      console.log('📡 Resposta da sincronização:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro HTTP:', response.status, errorData);
        setError(errorData.message || 'Erro ao sincronizar produtos');
        setCurrentStep('idle');
        return;
      }

      const result = await response.json();
      console.log('📊 Resultado da sincronização:', result);
      
      if (result.success) {
        setResults(result.data.results);
        setCurrentStep('completed');
        setProgress(100);
        console.log('✅ Sincronização em lote concluída com sucesso!');
        
        // Notificar que o sincronismo foi concluído
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setError(result.message || 'Erro na sincronização');
        setCurrentStep('idle');
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setCurrentStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCurrentStep('idle');
      setProgress(0);
      setResults([]);
      setError('');
      setCurrentProduct('');
      onClose();
    }
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Sincronização em Lote - Anymarket</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.length} produto(s) selecionado(s)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status e Progresso */}
          {currentStep === 'syncing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sincronizando produtos...</span>
                <span className="text-sm text-muted-foreground">
                  {progress}% concluído
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              {currentProduct && (
                <p className="text-sm text-muted-foreground">
                  Processando: {currentProduct}
                </p>
              )}
            </div>
          )}

          {/* Resultados */}
          {currentStep === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge variant={errorCount === 0 ? "default" : "destructive"} className="text-sm">
                  {successCount} sucessos
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {errorCount} erros
                  </Badge>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {result.productName || `Produto ${result.productId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {result.productId} | Anymarket: {result.anymarketId}
                        </p>
                        {result.success && result.title && (
                          <p className="text-xs text-green-600">
                            Título: {result.title}
                          </p>
                        )}
                        {result.success && result.characteristicsCount && (
                          <p className="text-xs text-blue-600">
                            {result.characteristicsCount} características
                          </p>
                        )}
                        {result.success && result.skuUpdate && (
                          <p className="text-xs text-purple-600">
                            {result.skuUpdate.data?.skus_updated || 0} SKUs atualizados
                          </p>
                        )}
                        {!result.success && result.error && (
                          <p className="text-xs text-red-600">
                            Erro: {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3">
            {currentStep === 'idle' && (
              <Button
                onClick={handleSync}
                disabled={selectedProducts.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Iniciar Sincronização
              </Button>
            )}

            {currentStep === 'completed' && (
              <Button onClick={handleClose} variant="outline">
                Fechar
              </Button>
            )}

            {currentStep === 'syncing' && (
              <Button disabled className="bg-green-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


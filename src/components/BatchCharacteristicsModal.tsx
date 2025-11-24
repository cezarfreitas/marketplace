'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  List,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock
} from 'lucide-react';

interface CharacteristicsBatchResult {
  productId: number;
  productName: string;
  success: boolean;
  message: string;
  error?: string;
  characteristicsGenerated?: number;
  duration?: number;
}

interface BatchCharacteristicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: number[];
  onComplete: (results: CharacteristicsBatchResult[]) => void;
}

export function BatchCharacteristicsModal({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  onComplete 
}: BatchCharacteristicsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CharacteristicsBatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentProduct, setCurrentProduct] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const totalProducts = selectedProducts.length;

  const handleStartProcessing = async () => {
    if (selectedProducts.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setResults([]);
    setIsCompleted(false);
    setCurrentProduct('Preparando geração de características...');

    try {
      console.log('🚀 Iniciando geração de características em lote para', selectedProducts.length, 'produtos');

      const response = await fetch('/api/generate-characteristics-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: selectedProducts,
          forceRegenerate: forceRegenerate
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.data.results);
        setProgress(100);
        setIsCompleted(true);
        setCurrentProduct('Processo concluído!');
        onComplete(data.data.results);
      } else {
        throw new Error(data.message || 'Erro ao processar lote');
      }

    } catch (error: any) {
      console.error('Erro ao processar lote:', error);
      setError(error.message);
      setIsCompleted(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      // Reset states
      setProgress(0);
      setResults([]);
      setError(null);
      setIsCompleted(false);
      setCurrentProduct('');
      setExpandedProduct(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <List className="w-5 h-5" />
            <span>Geração de Características em Lote</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Progress */}
                {!isCompleted && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-medium">
                        {successCount + errorCount} / {totalProducts}
                      </span>
                    </div>
                    <Progress value={(successCount + errorCount) / totalProducts * 100} className="h-2" />
                  </div>
                )}

                {/* Current Status */}
                {isProcessing && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900">{currentProduct}</p>
                    </div>
                  </div>
                )}

                {/* Summary Stats */}
                {(isCompleted || results.length > 0) && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{successCount}</div>
                      <div className="text-xs text-green-700">Sucesso</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                      <div className="text-xs text-red-700">Erros</div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results List */}
          {results.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                          result.success ? 'bg-white' : 'bg-red-50'
                        }`}
                        onClick={() => setExpandedProduct(expandedProduct === index ? null : index)}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.productName}
                            </p>
                            <p className="text-xs text-gray-500">{result.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.characteristicsGenerated !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {result.characteristicsGenerated} características
                            </Badge>
                          )}
                          {result.duration && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {(result.duration / 1000).toFixed(1)}s
                            </Badge>
                          )}
                          {expandedProduct === index ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedProduct === index && (
                        <div className="px-3 pb-3 pt-2 bg-gray-50 border-t">
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">ID do Produto:</span>
                              <span className="font-medium">{result.productId}</span>
                            </div>
                            {result.error && (
                              <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
                                <strong>Erro:</strong> {result.error}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceRegenerate"
                checked={forceRegenerate}
                onChange={(e) => setForceRegenerate(e.target.checked)}
                disabled={isProcessing}
                className="rounded"
              />
              <label htmlFor="forceRegenerate" className="text-sm text-gray-600">
                Forçar regeneração
              </label>
            </div>
            <div className="flex items-center space-x-2">
              {!isProcessing && !isCompleted && (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleStartProcessing}>
                    <List className="w-4 h-4 mr-2" />
                    Iniciar Geração
                  </Button>
                </>
              )}
              {isCompleted && (
                <Button onClick={handleClose}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


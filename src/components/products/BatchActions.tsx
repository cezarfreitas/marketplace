'use client';

import { useState, useEffect } from 'react';
import { Package, Trash2, X, Download, Loader2, Image, RefreshCw, Layers, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BatchProgress {
  isRunning: boolean;
  current: number;
  total: number;
  currentProduct: string;
  currentStep?: string;
}

interface BatchActionsProps {
  selectedProducts: number[];
  onClearSelection: () => void;
  onExportSelected: () => void;
  onViewSkus: () => void;
  onDeleteSelected: () => void;
  onBatchAnalysis: () => void;
  onBatchOptimizationNoCrop: () => void;
  onAnymarketSync: () => void;
  onBatchCharacteristics: () => void;
  isExporting: boolean;
}

export function BatchActions({
  selectedProducts,
  onClearSelection,
  onExportSelected,
  onViewSkus,
  onDeleteSelected,
  onBatchAnalysis,
  onBatchOptimizationNoCrop,
  onAnymarketSync,
  onBatchCharacteristics,
  isExporting
}: BatchActionsProps) {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batches, setBatches] = useState<Array<{id: number; name: string}>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Buscar lotes
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch('/api/batches?status=active&limit=1000');
        const data = await response.json();
        if (data.success) {
          setBatches(data.data.batches);
        }
      } catch (error) {
        console.error('Erro ao buscar lotes:', error);
      }
    };
    fetchBatches();
  }, []);

  // Adicionar produtos ao lote
  const handleAddToBatch = async () => {
    if (selectedBatchId === null) {
      alert('Selecione um lote');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/products/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProducts,
          batchId: selectedBatchId
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${selectedProducts.length} produto(s) adicionado(s) ao lote!`);
        setShowBatchModal(false);
        setSelectedBatchId(null);
        window.location.reload(); // Recarregar para atualizar a lista
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar produtos ao lote:', error);
      alert('❌ Erro ao adicionar produtos ao lote');
    } finally {
      setIsUpdating(false);
    }
  };

  if (selectedProducts.length === 0) return null;

  return (
    <>
    <Card className="mb-6 relative z-[10] border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {selectedProducts.length} produto(s) selecionado(s)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Execute ações em lote nos produtos selecionados
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar Seleção
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex-1">
          {/* Barras de progresso removidas */}
        </div>
        
        <div className="flex flex-wrap gap-1 ml-4">
          
          <button
            onClick={onExportSelected}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar XLSX"
          >
            {isExporting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
          
          <button
            onClick={onViewSkus}
            disabled={selectedProducts.length === 0}
            className="px-2 py-1 text-xs text-cyan-600 border border-cyan-300 rounded hover:bg-cyan-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Visualizar SKUs"
          >
            <Package className="h-3 w-3 mr-1" />
            SKUs
          </button>
          
          <button
            onClick={onBatchAnalysis}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-50 to-indigo-50"
            title="Análise de Imagens em Lote (com crop)"
          >
            <Image className="h-3 w-3 mr-1" />
            Otimização Completa
          </button>
          
          <button
            onClick={onBatchOptimizationNoCrop}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-purple-600 border border-purple-300 rounded hover:bg-purple-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-50 to-pink-50"
            title="Otimização em Lote (sem crop)"
          >
            <Image className="h-3 w-3 mr-1" />
            Otimização (Sem Crop)
          </button>
          
          <button
            onClick={onBatchCharacteristics}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-emerald-600 border border-emerald-300 rounded hover:bg-emerald-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-50 to-teal-50"
            title="Gerar Características em Lote"
          >
            <List className="h-3 w-3 mr-1" />
            Características
          </button>
          
          <button
            onClick={onAnymarketSync}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-50 to-emerald-50"
            title="Sincronizar com Anymarket"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Anymarket
          </button>
          
          <button
            onClick={() => setShowBatchModal(true)}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-orange-600 border border-orange-300 rounded hover:bg-orange-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Adicionar a Lote"
          >
            <Layers className="h-3 w-3 mr-1" />
            Adicionar a Lote
          </button>
          
          <button
            onClick={onDeleteSelected}
            disabled={isExporting}
            className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Excluir Selecionados"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>

    {/* Modal de Seleção de Lote */}
    {showBatchModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Layers className="w-5 h-5 mr-2 text-orange-600" />
            Adicionar {selectedProducts.length} produto(s) ao Lote
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Lote
            </label>
            <select
              value={selectedBatchId || ''}
              onChange={(e) => setSelectedBatchId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione um lote...</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddToBatch}
              disabled={isUpdating || selectedBatchId === null}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Adicionar ao Lote
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowBatchModal(false);
                setSelectedBatchId(null);
              }}
              variant="outline"
              disabled={isUpdating}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

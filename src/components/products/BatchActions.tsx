'use client';

import { useState } from 'react';
import { Package, Trash2, X, Download, Loader2, Image } from 'lucide-react';
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
  isExporting: boolean;
}

export function BatchActions({
  selectedProducts,
  onClearSelection,
  onExportSelected,
  onViewSkus,
  onDeleteSelected,
  onBatchAnalysis,
  isExporting
}: BatchActionsProps) {
  if (selectedProducts.length === 0) return null;

  return (
    <Card className="mb-6 relative z-[90] border-2 border-primary/20">
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
            title="Análise de Imagens em Lote"
          >
            <Image className="h-3 w-3 mr-1" />
            Otimização em Lote
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
  );
}

'use client';

import { useCallback } from 'react';
import { Product } from '@/modules/products';

interface BatchProgress {
  isRunning: boolean;
  current: number;
  total: number;
  currentProduct: string;
  currentStep?: string;
}

interface UseBatchOperationsProps {
  selectedProducts: number[];
  products: Product[];
  // Parâmetros removidos: análise, características, anymarket, estoque, crop
}

export function useBatchOperations({
  selectedProducts,
  products
}: UseBatchOperationsProps) {





  return {
    // Funções removidas: análise, características, anymarket, estoque, crop
  };
}

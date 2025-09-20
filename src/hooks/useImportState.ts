import { useState, useCallback } from 'react';

export interface ImportProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  totalProducts: number;
  processedProducts: number;
  successCount: number;
  errorCount: number;
  results: any[];
  errors: string[];
}

export interface ImportConfig {
  importProduct: boolean;
  importBrand: boolean;
  importCategory: boolean;
  importSkus: boolean;
  importImages: boolean;
  importStock: boolean;
  importAttributesVtex: boolean;
  skipExisting: boolean;
}

export interface ImportState {
  refIds: string;
  batchSize: number;
  config: ImportConfig;
  progress: ImportProgress;
  progressId: string | null;
}

export const useImportState = () => {
  const [state, setState] = useState<ImportState>({
    refIds: '',
    batchSize: 20,
    config: {
      importProduct: true,
      importBrand: true,
      importCategory: true,
      importSkus: true,
      importImages: true,
      importStock: true,
      importAttributesVtex: true,
      skipExisting: false
    },
    progress: {
      status: 'idle',
      progress: 0,
      message: '',
      totalProducts: 0,
      processedProducts: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
      errors: []
    },
    progressId: null
  });

  const updateRefIds = useCallback((refIds: string) => {
    setState(prev => ({ ...prev, refIds }));
  }, []);

  const updateBatchSize = useCallback((batchSize: number) => {
    setState(prev => ({ ...prev, batchSize }));
  }, []);

  const updateConfig = useCallback((config: Partial<ImportConfig>) => {
    setState(prev => ({ 
      ...prev, 
      config: { ...prev.config, ...config } 
    }));
  }, []);

  const updateProgress = useCallback((progress: Partial<ImportProgress>) => {
    
    setState(prev => {
      const newState = { 
        ...prev, 
        progress: { ...prev.progress, ...progress } 
      };
      return newState;
    });
  }, []);

  const setProgressId = useCallback((progressId: string | null) => {
    setState(prev => ({ ...prev, progressId }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      progress: {
        status: 'idle',
        progress: 0,
        message: '',
        totalProducts: 0,
        processedProducts: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: []
      },
      progressId: null
    }));
  }, []);

  return {
    state,
    updateRefIds,
    updateBatchSize,
    updateConfig,
    updateProgress,
    setProgressId,
    resetProgress
  };
};

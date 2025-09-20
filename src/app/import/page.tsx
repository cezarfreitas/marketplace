'use client';

import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useImportState } from '@/hooks/useImportState';
import { useImportLogic } from '@/hooks/useImportLogic';
import { 
  ImportInput, 
  ImportProgress, 
  ImportInfo 
} from '@/components/import';

export default function ImportPage() {
  const {
    state,
    updateRefIds,
    updateBatchSize,
    updateConfig,
    updateProgress,
    setProgressId,
    resetProgress
  } = useImportState();

  const { handleImport, formatTime } = useImportLogic();
  
  

  const handleImportClick = () => {
    
    handleImport(
      state.refIds,
      state.config,
      state.batchSize,
      updateProgress,
      setProgressId
    );
  };

  return (
    <Layout 
      title="Importação Completa VTEX" 
      subtitle="Importe todos os dados da VTEX: produtos, SKUs, estoque, marcas, categorias e imagens"
    >
      <div className="w-full">
        {/* Progresso - Acima de tudo */}
        <div className="mb-6">
          <ImportProgress progress={state.progress} />
        </div>

        {/* Input de Dados com Configurações */}
        <div className="mb-6">
          <ImportInput
            refIds={state.refIds}
            config={state.config}
            progressStatus={state.progress.status}
            onRefIdsChange={updateRefIds}
            onImport={handleImportClick}
          />
        </div>

        {/* Informações */}
        <ImportInfo />
      </div>
    </Layout>
  );
}

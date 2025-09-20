import { useCallback } from 'react';
import { ImportConfig, ImportProgress } from './useImportState';

export const useImportLogic = () => {
  const handleImport = useCallback(async (
    refIds: string,
    config: ImportConfig,
    batchSize: number,
    updateProgress: (progress: Partial<ImportProgress>) => void,
    setProgressId: (id: string | null) => void
  ) => {
    const refIdList = refIds.split('\n').filter(id => id.trim());
    
    if (refIdList.length === 0) {
      alert('Por favor, insira pelo menos um RefId');
      return;
    }

    if (refIdList.length > 200) {
      alert('Máximo de 200 produtos por importação. Use múltiplas chamadas para mais produtos.');
      return;
    }

    try {
      console.log('🚀 Iniciando importação com', refIdList.length, 'produtos');
      
      // Mostrar barra IMEDIATAMENTE quando o botão é clicado
      console.log('🚀 CHAMANDO updateProgress IMEDIATAMENTE...');
      updateProgress({
        status: 'running',
        progress: 0,
        message: 'Iniciando importação...',
        totalProducts: refIdList.length,
        processedProducts: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: []
      });
      console.log('✅ updateProgress chamado com status running');

      const response = await fetch('/api/import/batch-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refIds: refIdList,
          config,
          batchSize
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgressId(data.data.progressId);
        updateProgress({
          message: `Importação iniciada - Processando ${refIdList.length} produtos...`
        });
        
        // Iniciar polling do progresso
        pollProgress(data.data.progressId, updateProgress);
      } else {
        updateProgress({
          status: 'error',
          message: data.error || 'Erro ao iniciar importação'
        });
      }
    } catch (error: any) {
      updateProgress({
        status: 'error',
        message: `Erro: ${error.message}`
      });
    }
  }, []);

  const pollProgress = useCallback(async (
    id: string,
    updateProgress: (progress: Partial<ImportProgress>) => void
  ) => {
    const poll = async () => {
      try {
        console.log('🔍 Buscando progresso para ID:', id);
        const response = await fetch(`/api/import/batch-fast?progressId=${id}`);
        const data = await response.json();

        console.log('📊 Resposta do progresso:', data);

        if (data.success) {
          const progressData = data.data;
          console.log('📈 Atualizando progresso:', {
            status: progressData.status,
            progress: progressData.progress,
            message: progressData.message,
            totalItems: progressData.totalItems,
            completedItems: progressData.completedItems
          });

          // Usar mensagem padrão se estiver vazia
          const message = progressData.message || `Processando produtos... (${progressData.completedItems || 0}/${progressData.totalItems || 0})`;
          
          updateProgress({
            status: progressData.status,
            progress: progressData.progress,
            message: message,
            totalProducts: progressData.totalItems || 0,
            processedProducts: progressData.completedItems || 0,
            successCount: progressData.results?.filter((r: any) => r.success).length || 0,
            errorCount: progressData.errors?.length || 0,
            results: progressData.results || [],
            errors: progressData.errors || []
          });
          
          console.log('✅ Progresso atualizado no estado');

          // Continuar polling se ainda estiver rodando
          if (progressData.status === 'running') {
            setTimeout(poll, 1000); // Poll a cada 1 segundo
          }
        } else {
          console.error('❌ Erro na resposta do progresso:', data.error);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar progresso:', error);
        setTimeout(poll, 5000); // Tentar novamente em 5 segundos
      }
    };

    poll();
  }, []);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  return {
    handleImport,
    formatTime
  };
};

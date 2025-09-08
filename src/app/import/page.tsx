'use client';

import { useState, useEffect, useRef } from 'react';
import { Package, CheckCircle, XCircle, Clock, Upload, Play, Pause, RotateCcw } from 'lucide-react';
import Layout from '@/components/Layout';

// Força atualização do cache - versão 2.0
console.log('Import page loaded at:', new Date().toISOString());
console.log('Versão atualizada - handleProductImport disponível');

export default function ImportPage() {
  // Estados para importação otimizada
  const [refIdList, setRefIdList] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para iniciar importação otimizada
  const startImport = async () => {
    if (!refIdList.trim()) {
      alert('Por favor, insira pelo menos um RefId de produto');
      return;
    }

    // Separar RefIds de produtos por linha, vírgula ou espaço
    const refIds = refIdList
      .split(/[\n,\s]+/)
      .map(refId => refId.trim())
      .filter(refId => refId.length > 0);

    if (refIds.length === 0) {
      alert('Nenhum RefId de produto válido encontrado');
      return;
    }

    setIsImporting(true);
    setImportProgress(null);
    setImportResult(null);
    setProgressId(null);

    try {
      // Iniciar importação em lote
      const response = await fetch('/api/import/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refIds,
          batchId: `import_${Date.now()}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setProgressId(result.data.progressId);
        startProgressPolling(result.data.progressId);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Erro ao iniciar importação:', error);
      setImportResult({
        success: false,
        error: 'Erro ao iniciar importação'
      });
      setIsImporting(false);
    }
  };

  // Função para monitorar progresso
  const startProgressPolling = (id: string) => {
    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/import/batch?progressId=${id}`);
        const result = await response.json();
        
        if (result.success) {
          const progress = result.data;
          setImportProgress(progress);
          
          // Se importação concluída
          if (progress.processed >= progress.total) {
            setImportResult({
              success: progress.success > 0,
              total: progress.total,
              imported: progress.success,
              failed: progress.failed,
              errors: progress.errors
            });
            setIsImporting(false);
            stopProgressPolling();
            
            if (progress.success > 0) {
              setRefIdList(''); // Limpar lista após sucesso
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar progresso:', error);
        stopProgressPolling();
        setIsImporting(false);
      }
    };

    // Polling a cada 2 segundos
    intervalRef.current = setInterval(pollProgress, 2000);
    pollProgress(); // Primeira chamada imediata
  };

  // Função para parar o polling
  const stopProgressPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Limpar polling quando componente desmontar
  useEffect(() => {
    return () => {
      stopProgressPolling();
    };
  }, []);

  // Função para cancelar importação
  const cancelImport = () => {
    stopProgressPolling();
    setIsImporting(false);
    setImportProgress(null);
    setProgressId(null);
  };

  return (
    <Layout title="Importar" subtitle="Importação otimizada com barra de progresso - 5x mais rápida">
      {/* Importação por Lista de RefIds de Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Lista de RefIds de Produtos</h2>
              <p className="text-gray-600">Cole os RefIds dos produtos que deseja importar da VTEX</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="refIdList" className="block text-sm font-medium text-gray-700 mb-2">
                  RefIds de Produtos
                </label>
                <textarea
                  id="refIdList"
                  value={refIdList}
                  onChange={(e) => setRefIdList(e.target.value)}
                  placeholder="Cole aqui os RefIds dos produtos...&#10;&#10;Exemplos:&#10;XHDCAMM0I20B1&#10;880010, 12345&#10;XHDCAMM0I20B1 880010 12345"
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                  disabled={isImporting}
                />
                <div className="mt-2 text-right">
                  <span className="text-xs text-gray-500">
                    {refIdList.split(/[\n,\s]+/).filter(refId => refId.trim().length > 0).length} RefIds
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {!isImporting ? (
                  <button
                    onClick={startImport}
                    disabled={!refIdList.trim()}
                    className="btn-primary flex items-center gap-2 flex-1"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar Importação
                  </button>
                ) : (
                  <button
                    onClick={cancelImport}
                    className="btn-secondary flex items-center gap-2 flex-1"
                  >
                    <Pause className="h-4 w-4" />
                    Cancelar
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setRefIdList('');
                    setImportProgress(null);
                    setImportResult(null);
                  }}
                  disabled={isImporting}
                  className="btn-secondary"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Informações */}
        <div className="space-y-6">
          {/* Como Usar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Como Usar</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-sm text-gray-600">Cole os RefIds dos produtos da VTEX</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-sm text-gray-600">Separe por linha, vírgula ou espaço</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-sm text-gray-600">Clique em &quot;Importar Produtos&quot;</p>
              </div>
            </div>
          </div>

          {/* O que é Importado */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">O que é Importado</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">Informações do produto</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">Todos os SKUs e variações</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">Marcas e categorias</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">Dados de estoque e preços</p>
              </div>
            </div>
          </div>

          {/* Melhorias da Nova Versão */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 Novas Melhorias</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Processamento em lote otimizado</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Barra de progresso em tempo real</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Processamento paralelo (5x mais rápido)</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Tratamento de erros melhorado</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Possibilidade de cancelar importação</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      {importProgress && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Progresso da Importação</h2>
              <p className="text-gray-600">{importProgress.current}</p>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso: {importProgress.processed} de {importProgress.total}</span>
                <span>{Math.round((importProgress.processed / importProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Estatísticas em Tempo Real */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Sucessos</p>
                    <p className="text-2xl font-bold text-green-900">{importProgress.success}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Falhas</p>
                    <p className="text-2xl font-bold text-red-900">{importProgress.failed}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{importProgress.total}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Lista de Erros */}
            {importProgress.errors && importProgress.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Erros Encontrados</h3>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {importProgress.errors.map((error: string, index: number) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultado da Importação */}
      {importResult && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Resultado da Importação</h2>
              <p className="text-gray-600">Resumo do processamento dos produtos</p>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Sucessos</p>
                    <p className="text-2xl font-bold text-green-900">{importResult.imported || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Falhas</p>
                    <p className="text-2xl font-bold text-red-900">{importResult.failed || 0}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{importResult.total || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Lista de Erros */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Erros Encontrados</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {importResult.errors.map((error: string, index: number) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem de Sucesso/Erro */}
            <div className={`p-4 rounded-lg ${
              importResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                {importResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {importResult.success 
                      ? `Importação concluída com sucesso! ${importResult.imported} produtos importados.`
                      : 'Importação falhou. Verifique os erros acima.'
                    }
                  </p>
                  {importResult.error && (
                    <p className="text-sm text-red-600 mt-1">{importResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
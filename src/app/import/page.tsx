'use client';

import { useState } from 'react';
import Card from '@/components/Card';
import ActionCard from '@/components/ActionCard';
import Layout from '@/components/Layout';

interface ImportProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  totalProducts: number;
  processedProducts: number;
  successCount: number;
  errorCount: number;
  results: any[];
  errors: string[];
  estimatedTime?: string;
}

export default function ImportPage() {
  const [refIds, setRefIds] = useState('');
  const [batchSize, setBatchSize] = useState(20);
  const [config, setConfig] = useState({
    importProduct: true,
    importBrand: true,
    importCategory: true,
    importSkus: true,
    importImages: true,
    importStock: true,
    skipExisting: true
  });
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    progress: 0,
    message: '',
    totalProducts: 0,
    processedProducts: 0,
    successCount: 0,
    errorCount: 0,
    results: [],
    errors: []
  });
  const [progressId, setProgressId] = useState<string | null>(null);

  const handleImport = async () => {
    const refIdList = refIds.split('\n').filter(id => id.trim());
    
    if (refIdList.length === 0) {
      alert('Por favor, insira pelo menos um RefId');
      return;
    }

    if (refIdList.length > 100) {
      alert('Máximo de 100 produtos por importação. Use múltiplas chamadas para mais produtos.');
      return;
    }

    try {
      setProgress({
        status: 'running',
        progress: 0,
        message: 'Iniciando importação rápida...',
        totalProducts: refIdList.length,
        processedProducts: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: []
      });

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
        setProgress(prev => ({
          ...prev,
          message: `Importação iniciada - ${data.data.estimatedTime}`,
          estimatedTime: data.data.estimatedTime
        }));
        
        // Iniciar polling do progresso
        pollProgress(data.data.progressId);
      } else {
        setProgress(prev => ({
          ...prev,
          status: 'error',
          message: data.error || 'Erro ao iniciar importação'
        }));
      }
    } catch (error: any) {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: `Erro: ${error.message}`
      }));
    }
  };

  const pollProgress = async (id: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/import/batch-fast?progressId=${id}`);
        const data = await response.json();

        if (data.success) {
          const progressData = data.data;
          setProgress(prev => ({
            ...prev,
            status: progressData.status,
            progress: progressData.progress,
            message: progressData.message,
            processedProducts: progressData.processedProducts || 0,
            successCount: progressData.successCount || 0,
            errorCount: progressData.errorCount || 0,
            results: progressData.results || [],
            errors: progressData.errors || []
          }));

          // Continuar polling se ainda estiver rodando
          if (progressData.status === 'running') {
            setTimeout(poll, 1000); // Poll a cada 1 segundo
          }
        }
      } catch (error) {
        console.error('Erro ao buscar progresso:', error);
        setTimeout(poll, 5000); // Tentar novamente em 5 segundos
      }
    };

    poll();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <Layout title="Importação Rápida" subtitle="Importe produtos da VTEX com processamento paralelo otimizado">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Importação Rápida em Lote
          </h1>
          <p className="text-gray-600">
            Importe até 100 produtos simultaneamente com processamento paralelo otimizado
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuração */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-semibold mb-4">⚙️ Configuração</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho do Lote
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 produtos</option>
                    <option value={10}>10 produtos</option>
                    <option value={15}>15 produtos</option>
                    <option value={20}>20 produtos (recomendado)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Produtos processados em paralelo por lote
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opções de Importação
                  </label>
                  <div className="space-y-2">
                    {Object.entries(config).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Entrada de Dados */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold mb-4">📦 RefIds dos Produtos</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lista de RefIds (um por linha)
                  </label>
                  <textarea
                    value={refIds}
                    onChange={(e) => setRefIds(e.target.value)}
                    placeholder="TROMOLM0090L1&#10;STAMOLU004021&#10;ECKBERM0220C1"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {refIds.split('\n').filter(id => id.trim()).length} produtos inseridos
                  </p>
                </div>

                <button
                  onClick={handleImport}
                  disabled={progress.status === 'running' || refIds.trim() === ''}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {progress.status === 'running' ? 'Importando...' : 'Iniciar Importação Rápida'}
                </button>
              </div>
            </Card>
          </div>
        </div>

        {/* Progresso */}
        {progress.status !== 'idle' && (
          <div className="mt-6">
            <Card>
              <h2 className="text-xl font-semibold mb-4">📊 Progresso da Importação</h2>
              <div className="space-y-4">
                {/* Barra de Progresso */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{progress.message}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress.status === 'error' ? 'bg-red-500' :
                        progress.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progress.totalProducts}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{progress.errorCount}</div>
                    <div className="text-sm text-gray-600">Erros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {progress.results.reduce((total, result) => total + (result.data?.errors?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Avisos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {progress.estimatedTime || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Tempo Est.</div>
                  </div>
                </div>

                {/* Resultados */}
                {progress.results.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Resultados Recentes</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {progress.results.slice(-10).map((result, index) => (
                        <div
                          key={index}
                          className={`text-sm p-2 rounded ${
                            result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                          }`}
                        >
                          {result.data?.refId}: {result.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumo dos Tipos de Avisos */}
                {progress.results.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📊 Resumo dos Tipos de Avisos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <span className="text-blue-500 text-lg mr-2">🖼️</span>
                          <span className="font-medium text-blue-900">Imagens</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {progress.results.reduce((total, result) => {
                            return total + (result.data?.errors?.filter((error: string) => 
                              error.includes('não conseguiu importar imagens')
                            ).length || 0);
                          }, 0)} SKUs sem imagens
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <span className="text-yellow-500 text-lg mr-2">📦</span>
                          <span className="font-medium text-yellow-900">Estoque</span>
                        </div>
                        <div className="text-sm text-yellow-700">
                          {progress.results.reduce((total, result) => {
                            return total + (result.data?.stockResult?.data?.errors?.length || 0);
                          }, 0)} problemas de estoque
                        </div>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <span className="text-orange-500 text-lg mr-2">⚠️</span>
                          <span className="font-medium text-orange-900">Outros</span>
                        </div>
                        <div className="text-sm text-orange-700">
                          {progress.results.reduce((total, result) => {
                            return total + (result.data?.errors?.filter((error: string) => 
                              !error.includes('não conseguiu importar imagens') &&
                              !error.includes('Estoque SKU')
                            ).length || 0);
                          }, 0)} outros avisos
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detalhes dos Avisos e Erros */}
                {progress.results.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📋 Detalhes dos Avisos e Erros</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {progress.results.map((result, index) => {
                        const hasWarnings = result.data?.errors && result.data.errors.length > 0;
                        const hasStockIssues = result.data?.stockResult?.data?.errors && result.data.stockResult.data.errors.length > 0;
                        
                        if (!hasWarnings && !hasStockIssues) return null;

                        return (
                          <div key={index} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{result.data?.refId}</span>
                              <span className="text-sm text-yellow-600">
                                {result.data?.errors?.length || 0} avisos
                              </span>
                            </div>
                            
                            {/* Avisos do Produto */}
                            {result.data?.errors && result.data.errors.length > 0 && (
                              <div className="mb-2">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">⚠️ Avisos do Produto:</h5>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {result.data.errors.map((error: string, errorIndex: number) => (
                                    <li key={errorIndex} className="flex items-start">
                                      <span className="text-yellow-500 mr-1">•</span>
                                      <span>{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Avisos de Estoque */}
                            {hasStockIssues && (
                              <div className="mb-2">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">📦 Avisos de Estoque:</h5>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {result.data.stockResult.data.errors.map((error: string, errorIndex: number) => (
                                    <li key={errorIndex} className="flex items-start">
                                      <span className="text-yellow-500 mr-1">•</span>
                                      <span>{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Estatísticas de Estoque */}
                            {result.data?.stockResult && (
                              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-yellow-200">
                                <span className="font-medium">Estoque:</span> {result.data.stockResult.data?.importedCount || 0} importados, {result.data.stockResult.data?.updatedCount || 0} atualizados
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Erros */}
                {progress.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Erros</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {progress.errors.slice(-5).map((error, index) => (
                        <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Informações de Performance */}
        <div className="mt-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">⚡ Informações de Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard
                title="Processamento Paralelo"
                description="Produtos são processados em lotes paralelos para máxima velocidade"
                icon="⚡"
              />
              <ActionCard
                title="Cache Inteligente"
                description="Marcas e categorias são cacheadas para evitar importações duplicadas"
                icon="🧠"
              />
              <ActionCard
                title="Tratamento de Erros"
                description="Erros não bloqueiam o processamento de outros produtos"
                icon="🛡️"
              />
            </div>
          </Card>
        </div>

        {/* Informações sobre Avisos */}
        <div className="mt-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">ℹ️ Sobre os Avisos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🖼️ Avisos de Imagens</h3>
                <p className="text-sm text-gray-600 mb-2">
                  SKUs que não possuem imagens cadastradas na VTEX. O sistema tenta importar 3 vezes automaticamente.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Não afeta a funcionalidade do produto</li>
                  <li>• Produto continua sendo importado normalmente</li>
                  <li>• Normal para alguns produtos</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📦 Avisos de Estoque</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Problemas temporários na API de estoque da VTEX ou warehouses sem estoque.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Sistema tenta novamente automaticamente</li>
                  <li>• Produto é importado mesmo sem estoque</li>
                  <li>• Estoque pode ser atualizado posteriormente</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">⚠️ Outros Avisos</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Campos faltantes na VTEX ou problemas menores de conectividade.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Dados opcionais não encontrados</li>
                  <li>• Problemas temporários de API</li>
                  <li>• Não impedem a importação</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">✅ Taxa de Sucesso</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Produtos com avisos ainda são considerados importados com sucesso.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Avisos ≠ Erros críticos</li>
                  <li>• Produto funcional mesmo com avisos</li>
                  <li>• Dados principais sempre importados</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
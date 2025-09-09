'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import { 
  BarChart3, 
  Clock, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Eye,
  Trash2,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalysisLog {
  id: number;
  product_id: number;
  product_name: string;
  product_title: string;
  product_ref_id: string;
  agent_name: string;
  agent_model: string;
  analysis_type: 'openai' | 'fallback';
  model_used: string;
  tokens_used: number;
  max_tokens: number;
  temperature: number;
  analysis_quality: 'alta' | 'media' | 'baixa';
  total_images: number;
  valid_images: number;
  invalid_images: number;
  product_type: string;
  analysis_duration_ms: number;
  openai_response_time_ms: number;
  success: boolean;
  error_message?: string;
  analysis_text: string;
  created_at: string;
}

interface AnalysisStats {
  total_analyses: number;
  successful_analyses: number;
  failed_analyses: number;
  openai_analyses: number;
  fallback_analyses: number;
  total_tokens_used: number;
  avg_duration_ms: number;
  avg_openai_response_ms: number;
  avg_tokens_per_analysis: number;
}

export default function AnalysisLogsPage() {
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    productRefId: '',
    analysisType: '',
    success: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedLog, setSelectedLog] = useState<AnalysisLog | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (filters.productRefId) params.append('productRefId', filters.productRefId);
      if (filters.analysisType) params.append('analysisType', filters.analysisType);
      if (filters.success) params.append('success', filters.success);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/analysis-logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setStats(result.data.stats);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        console.error('Erro ao carregar logs:', result.message);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este log?')) return;

    try {
      const response = await fetch(`/api/analysis-logs?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        loadLogs();
      } else {
        alert('Erro ao deletar log: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao deletar log:', error);
      alert('Erro de conexão ao deletar log');
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'alta': return 'text-green-600 bg-green-100';
      case 'media': return 'text-yellow-600 bg-yellow-100';
      case 'baixa': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAnalysisTypeColor = (type: string) => {
    switch (type) {
      case 'openai': return 'text-purple-600 bg-purple-100';
      case 'fallback': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Layout title="Logs de Análise" subtitle="Histórico de análises de imagens">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Carregando logs...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Logs de Análise" subtitle="Histórico de análises de imagens">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              Logs de Análise de Imagens
            </h1>
            <p className="text-gray-600 mt-1">
              Histórico completo de análises realizadas
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </button>
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total de Análises</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_analyses}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Sucessos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successful_analyses}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Tokens Usados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_tokens_used.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avg_duration_ms)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filtros */}
        {showFilters && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  REF ID do Produto
                </label>
                <input
                  type="text"
                  value={filters.productRefId}
                  onChange={(e) => setFilters({ ...filters, productRefId: e.target.value })}
                  placeholder="Digite o REF ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Análise
                </label>
                <select
                  value={filters.analysisType}
                  onChange={(e) => setFilters({ ...filters, analysisType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="openai">OpenAI</option>
                  <option value="fallback">Fallback</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.success}
                  onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Sucesso</option>
                  <option value="false">Erro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Tabela de Logs */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    REF ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qualidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imagens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.product_name || `Produto ${log.product_id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.product_title || 'Sem título'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {log.product_ref_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAnalysisTypeColor(log.analysis_type)}`}>
                        {log.analysis_type === 'openai' ? 'OpenAI' : 'Fallback'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQualityColor(log.analysis_quality)}`}>
                        {log.analysis_quality}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.valid_images}/{log.total_images}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.tokens_used.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(log.analysis_duration_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Modal de Detalhes */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Detalhes da Análise
                  </h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações do Produto</h3>
                      <div className="space-y-2">
                        <p><strong>Nome:</strong> {selectedLog.product_name || 'N/A'}</p>
                        <p><strong>Título:</strong> {selectedLog.product_title || 'N/A'}</p>
                        <p><strong>REF ID:</strong> <span className="font-mono">{selectedLog.product_ref_id || 'N/A'}</span></p>
                        <p><strong>Tipo:</strong> {selectedLog.product_type || 'N/A'}</p>
                        <p><strong>ID:</strong> {selectedLog.product_id}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Configurações</h3>
                      <div className="space-y-2">
                        <p><strong>Agente:</strong> {selectedLog.agent_name || 'N/A'}</p>
                        <p><strong>Modelo:</strong> {selectedLog.model_used || 'N/A'}</p>
                        <p><strong>Temperatura:</strong> {selectedLog.temperature}</p>
                        <p><strong>Max Tokens:</strong> {selectedLog.max_tokens}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Estatísticas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Imagens</p>
                        <p className="text-xl font-bold">{selectedLog.valid_images}/{selectedLog.total_images}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Tokens</p>
                        <p className="text-xl font-bold">{selectedLog.tokens_used.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Duração</p>
                        <p className="text-xl font-bold">{formatDuration(selectedLog.analysis_duration_ms)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Qualidade</p>
                        <p className="text-xl font-bold">{selectedLog.analysis_quality}</p>
                      </div>
                    </div>
                  </div>

                  {/* Análise */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Análise Gerada</h3>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedLog.analysis_text || 'Nenhuma análise disponível'}
                      </p>
                    </div>
                  </div>

                  {/* Erro (se houver) */}
                  {!selectedLog.success && selectedLog.error_message && (
                    <div>
                      <h3 className="text-lg font-semibold text-red-600 mb-3">Erro</h3>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-700">{selectedLog.error_message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

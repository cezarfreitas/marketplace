'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  History, Clock, CheckCircle, AlertCircle, 
  X, Filter, Search, Calendar, FileImage
} from 'lucide-react';

interface CropLog {
  id: number;
  product_id: number;
  anymarket_id: string;
  product_name: string;
  status: 'processing' | 'completed' | 'failed';
  total_images: number;
  processed_images: number;
  failed_images: number;
  pixian_success_count: number;
  pixian_error_count: number;
  anymarket_success_count: number;
  anymarket_error_count: number;
  processing_time_seconds: number;
  error_message: string | null;
  details: any;
  started_at: string;
  completed_at: string | null;
  total_processing_count: number;
  first_processed_at: string;
}

export default function CropLogsPage() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<CropLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    productId: searchParams.get('productId') || '',
    anymarketId: searchParams.get('anymarketId') || '',
    status: searchParams.get('status') || '',
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.anymarketId) params.append('anymarketId', filters.anymarketId);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/crop-logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setPagination(result.data.pagination);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <History className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Logs de Processamento</h1>
              <p className="text-gray-600">Histórico de processamento de imagens com Pixian.ai</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID do Produto
              </label>
              <input
                type="text"
                value={filters.productId}
                onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value, offset: 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Ex: 123"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Anymarket
              </label>
              <input
                type="text"
                value={filters.anymarketId}
                onChange={(e) => setFilters(prev => ({ ...prev, anymarketId: e.target.value, offset: 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Ex: AM123456"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, offset: 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Todos</option>
                <option value="completed">Concluído</option>
                <option value="failed">Falhou</option>
                <option value="processing">Processando</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters(prev => ({ ...prev, offset: 0 }))}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Logs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                Carregando logs...
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Erro ao carregar logs</p>
              <p className="text-gray-600 text-sm mt-1">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Nenhum log encontrado</p>
              <p className="text-gray-500 text-sm mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {pagination.total} log(s) encontrado(s)
                  </h2>
                  <div className="text-sm text-gray-600">
                    Página {Math.floor(filters.offset / filters.limit) + 1} de {Math.ceil(pagination.total / filters.limit)}
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        {getStatusIcon(log.status)}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {log.product_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>ID: {log.product_id}</span>
                            <span>Anymarket: {log.anymarket_id}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(log.started_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(log.status)}`}>
                          {log.status === 'completed' ? 'Concluído' : 
                           log.status === 'failed' ? 'Falhou' : 'Processando'}
                        </span>
                        {log.total_processing_count > 1 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            {log.total_processing_count}x
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileImage className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{log.total_images}</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Processadas</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{log.processed_images}</p>
                      </div>
                      
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Falharam</span>
                        </div>
                        <p className="text-2xl font-bold text-red-900">{log.failed_images}</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">Tempo</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{formatDuration(log.processing_time_seconds)}</p>
                      </div>
                    </div>
                    
                    {log.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-red-800 mb-1">Erro:</p>
                        <p className="text-sm text-red-700">{log.error_message}</p>
                      </div>
                    )}
                    
                    {log.details && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                          Ver detalhes técnicos
                        </summary>
                        <div className="mt-2 bg-gray-50 rounded-lg p-3">
                          <pre className="text-xs text-gray-700 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Paginação */}
              {pagination.total > filters.limit && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    disabled={filters.offset === 0}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {filters.offset + 1} - {Math.min(filters.offset + filters.limit, pagination.total)} de {pagination.total}
                  </span>
                  
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={!pagination.hasMore}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, RotateCcw, AlertCircle, CheckCircle, Database, Calendar } from 'lucide-react';
import ColumnMappingModal from '@/components/ColumnMappingModal';

interface StatsData {
  total: number;
  lastUpdated: string;
  uniqueVtexProducts: number;
  uniqueAnymarketProducts: number;
  recentSyncs: any[];
}

export default function AnymarketPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Estados para mapeamento dinâmico
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  
  // Estados para estatísticas
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  

  // Buscar estatísticas
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/anymarket/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Erro ao carregar estatísticas:', data.message);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar estatísticas');
    } finally {
      setLoadingStats(false);
    }
  };


  // Carregar estatísticas ao montar o componente
  useEffect(() => {
    fetchStats();
  }, []);

  // Analisar arquivo automaticamente quando selecionado
  const handleFileSelection = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setFileAnalysis(null);
    setShowMappingModal(false);

    // Analisar arquivo automaticamente
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/anymarket/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFileAnalysis(data.data);
        setShowMappingModal(true);
      } else {
        setError(data.message || 'Erro ao analisar arquivo');
      }
    } catch (err) {
      setError('Erro de conexão ao analisar arquivo');
    } finally {
      setUploading(false);
    }
  };

  // Processar arquivo com mapeamento personalizado
  const handleFileProcess = async (idAnyColumn: string, refIdColumn: string) => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('idAnyColumn', idAnyColumn);
      formData.append('refIdColumn', refIdColumn);

      const response = await fetch('/api/anymarket/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Arquivo processado com sucesso! ${data.data.processed} registros importados.`);
        setSelectedFile(null);
        setShowMappingModal(false);
        setFileAnalysis(null);
        // Recarregar estatísticas após importação
        await fetchStats();
      } else {
        setError(data.message || 'Erro ao processar arquivo');
      }
    } catch (err) {
      setError('Erro de conexão ao processar arquivo');
    } finally {
      setProcessing(false);
    }
  };




  return (
    <Layout title="Anymarket" subtitle="Importação e gestão de produtos no Anymarket">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Mapeamentos */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Mapeamentos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <RotateCcw className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.total?.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Produtos VTEX */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos VTEX</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <RotateCcw className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.uniqueVtexProducts?.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Produtos Anymarket */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos Anymarket</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <RotateCcw className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.uniqueAnymarketProducts?.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Última Sincronização */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Última Sincronização</p>
                <p className="text-sm font-bold text-gray-900">
                  {loadingStats ? (
                    <RotateCcw className="w-4 h-4 animate-spin text-gray-400" />
                  ) : stats?.lastUpdated ? (
                    new Date(stats.lastUpdated).toLocaleString('pt-BR')
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>


        {/* Alertas */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-800">{success}</span>
          </div>
        )}


        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Upload de Arquivo Excel
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o arquivo Excel (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelection(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Status do arquivo selecionado */}
            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                      <p className="text-xs text-blue-700">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  {uploading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analisando...</span>
                    </div>
                  )}
                </div>
              </div>
            )}


          </div>
        </div>

      </div>

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setFileAnalysis(null);
        }}
        onProcess={handleFileProcess}
        fileData={fileAnalysis}
        processing={processing}
      />
    </Layout>
  );
}

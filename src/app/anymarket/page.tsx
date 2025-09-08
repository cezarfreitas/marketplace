'use client';

import { useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, Download, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface AnymarketData {
  id: number;
  id_any: string;
  ref_id: string;
  product_name?: string;
  created_at: string;
  updated_at: string;
}

export default function AnymarketPage() {
  const [anymarketData, setAnymarketData] = useState<AnymarketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Carregar dados do Anymarket
  const fetchAnymarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/anymarket');
      const data = await response.json();
      
      if (data.success) {
        setAnymarketData(data.data || []);
      } else {
        setError(data.message || 'Erro ao carregar dados do Anymarket');
      }
    } catch (err) {
      setError('Erro de conexão ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload de arquivo Excel
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo Excel');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/anymarket/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Arquivo processado com sucesso! ${data.processed} registros importados.`);
        setSelectedFile(null);
        await fetchAnymarketData(); // Recarregar dados
      } else {
        setError(data.message || 'Erro ao processar arquivo');
      }
    } catch (err) {
      setError('Erro de conexão ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  // Limpar todos os dados
  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados do Anymarket?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anymarket', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Todos os dados foram limpos com sucesso!');
        setAnymarketData([]);
      } else {
        setError(data.message || 'Erro ao limpar dados');
      }
    } catch (err) {
      setError('Erro de conexão ao limpar dados');
    } finally {
      setLoading(false);
    }
  };

  // Download do template
  const handleDownloadTemplate = () => {
    const csvContent = "ID_ANY,REF_ID\nEXEMPLO001,PROD001\nEXEMPLO002,PROD002";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_anymarket.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="Anymarket" subtitle="Sincronização e gestão de produtos no Anymarket">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileSpreadsheet className="w-8 h-8 mr-3 text-blue-600" />
            Anymarket
          </h1>
          <p className="mt-2 text-gray-600">
            Gerencie a vinculação entre ID_ANY e REF_ID para sincronização com o Anymarket
          </p>
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
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? 'Processando...' : 'Fazer Upload'}
              </button>

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Template
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>Formatos suportados:</strong> .xlsx, .xls, .csv</p>
              <p><strong>Formato esperado:</strong> Arquivo com colunas ID_ANY e REF_ID</p>
              <p><strong>Exemplo:</strong></p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
{`ID_ANY        | REF_ID
EXEMPLO001    | PROD001
EXEMPLO002    | PROD002`}
              </pre>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={fetchAnymarketData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Carregando...' : 'Atualizar Dados'}
          </button>

          <button
            onClick={handleClearAll}
            disabled={loading || anymarketData.length === 0}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Todos os Dados
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Dados do Anymarket ({anymarketData.length} registros)
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          ) : anymarketData.length === 0 ? (
            <div className="p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum dado encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Faça upload de um arquivo Excel para começar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID_ANY
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REF_ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome do Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {anymarketData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.id_any}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ref_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.product_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

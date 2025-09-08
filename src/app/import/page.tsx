'use client';

import { useState } from 'react';
import { Package, CheckCircle, XCircle, Clock, Upload } from 'lucide-react';
import Layout from '@/components/Layout';

// Força atualização do cache - versão 2.0
console.log('Import page loaded at:', new Date().toISOString());
console.log('Versão atualizada - handleProductImport disponível');

export default function ImportPage() {
  // Estados para importação por RefIds de produtos
  const [refIdList, setRefIdList] = useState('');
  const [productImporting, setProductImporting] = useState(false);
  const [productImportResult, setProductImportResult] = useState<any>(null);

  const handleProductImport = async () => {
    console.log('🚀 handleProductImport chamado!');
    
    if (!refIdList.trim()) {
      alert('Por favor, insira pelo menos um RefId de produto');
      return;
    }

    setProductImporting(true);
    setProductImportResult(null);
    
    try {
      // Separar RefIds de produtos por linha, vírgula ou espaço
      const refIds = refIdList
        .split(/[\n,\s]+/)
        .map(refId => refId.trim())
        .filter(refId => refId.length > 0);

      if (refIds.length === 0) {
        alert('Nenhum RefId de produto válido encontrado');
        return;
      }

      console.log('RefIds de produtos a serem importados:', refIds);

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // Importar cada produto
      for (const refId of refIds) {
        try {
          const response = await fetch('/api/import/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refId }),
          });

          const result = await response.json();
          
          results.push({
            refId,
            status: result.success ? 'imported' : 'failed',
            name: result.data?.product?.Name || `Produto ${refId}`,
            message: result.message
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }

          // Pequena pausa entre importações
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Erro ao importar produto ${refId}:`, error);
          results.push({
            refId,
            status: 'failed',
            name: `Produto ${refId}`,
            message: 'Erro na importação'
          });
          failCount++;
        }
      }

      setProductImportResult({
        success: successCount > 0,
        total: refIds.length,
        imported: successCount,
        failed: failCount,
        products: results
      });

      if (successCount > 0) {
        setRefIdList(''); // Limpar lista após sucesso
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      setProductImportResult({
        success: false,
        error: 'Erro na importação dos produtos'
      });
    } finally {
      setProductImporting(false);
    }
  };

  return (
    <Layout title="Importar" subtitle="Importe produtos da VTEX através de RefIds">
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
                  disabled={productImporting}
                />
                <div className="mt-2 text-right">
                  <span className="text-xs text-gray-500">
                    {refIdList.split(/[\n,\s]+/).filter(refId => refId.trim().length > 0).length} RefIds
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleProductImport}
                  disabled={productImporting || !refIdList.trim()}
                  className="btn-primary flex items-center gap-2 flex-1"
                >
                  {productImporting ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importar Produtos
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setRefIdList('')}
                  disabled={productImporting}
                  className="btn-secondary"
                >
                  Limpar
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
                <p className="text-sm text-gray-600">Imagens e arquivos</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">Dados de estoque e preços</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resultado da Importação */}
      {productImportResult && (
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
                    <p className="text-2xl font-bold text-green-900">{productImportResult.imported || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Falhas</p>
                    <p className="text-2xl font-bold text-red-900">{productImportResult.failed || 0}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{productImportResult.total || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>


            {/* Produtos Importados */}
            {productImportResult.products && productImportResult.products.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resultado dos Produtos</h3>
                <div className="space-y-3">
                  {productImportResult.products.map((item: any, index: number) => (
                    <div key={index} className={`flex items-center space-x-3 p-3 rounded border ${
                      item.status === 'imported' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      {item.status === 'imported' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          item.status === 'imported' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {item.name}
                        </p>
                        <p className={`text-sm ${
                          item.status === 'imported' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          RefId: {item.refId} - {item.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
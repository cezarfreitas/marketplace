'use client';

import { useState, useEffect } from 'react';
import { Package, Warehouse, CheckCircle } from 'lucide-react';
import Layout from '@/components/Layout';

export default function DashboardPage() {
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [totalOptimized, setTotalOptimized] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotalProducts = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      if (data.success) {
        setTotalProducts(data.data.total || 0);
        setTotalStock(data.data.totalStock || 0);
        setTotalOptimized(data.data.totalOptimized || 0);
      } else {
        throw new Error(data.message || 'Erro ao buscar estatísticas');
      }
    } catch (error) {
      console.error('Erro ao buscar total de produtos:', error);
      setError(error instanceof Error ? error.message : 'Erro ao conectar com a base de dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalProducts();
  }, []);

  return (
    <Layout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="w-full">
        {/* Exibir erro se houver */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold">Erro de Conexão</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cards em grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Card de Total de Produtos */}
          <div>
            <div className="bg-orange-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-orange-200 p-6">
              {/* Cabeçalho */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center mr-3">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-orange-100">Total de Produtos</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="text-center">
                <div className="font-bold text-white text-4xl mb-2">
                  {loading ? (
                    <div className="animate-pulse bg-orange-300 rounded mx-auto h-10 w-24"></div>
                  ) : (
                    <span>{totalProducts.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-center mt-4">
                <p className="text-xs text-orange-100">
                  Produtos cadastrados no sistema
                </p>
              </div>
            </div>
          </div>

          {/* Card de Total de Estoque */}
          <div>
            <div className="bg-teal-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-teal-200 p-6">
              {/* Cabeçalho */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center mr-3">
                  <Warehouse className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-teal-100">Total de Estoque</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="text-center">
                <div className="font-bold text-white text-4xl mb-2">
                  {loading ? (
                    <div className="animate-pulse bg-teal-300 rounded mx-auto h-10 w-24"></div>
                  ) : (
                    <span>{totalStock.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-center mt-4">
                <p className="text-xs text-teal-100">
                  Quantidade total em estoque
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos Otimizados */}
          <div>
            <div className="bg-green-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-green-200 p-6">
              {/* Cabeçalho */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-400 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-green-100">Otimizados</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="text-center">
                <div className="font-bold text-white text-4xl mb-2">
                  {loading ? (
                    <div className="animate-pulse bg-green-300 rounded mx-auto h-10 w-24"></div>
                  ) : (
                    <span>{totalOptimized.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-center mt-4">
                <p className="text-xs text-green-100">
                  Produtos totalmente otimizados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Layers,
  Package,
  Calendar,
  Archive,
  CheckCircle,
  ShoppingCart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Batch {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'archived';
  total_products: number;
  actual_product_count: number;
  anymarket_count: number;
  optimized_count: number;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'archived'
  });

  // Buscar lotes
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '1000'); // Buscar todos

      const response = await fetch(`/api/batches?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setBatches(data.data.batches);
      }
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [search, statusFilter]);

  // Criar lote
  const handleCreate = async () => {
    if (!formData.name) {
      alert('Nome do lote é obrigatório');
      return;
    }

    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Lote criado com sucesso!');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', status: 'active' });
        fetchBatches();
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      alert('❌ Erro ao criar lote');
    }
  };

  // Atualizar lote
  const handleUpdate = async () => {
    if (!editingBatch || !formData.name) {
      alert('Nome do lote é obrigatório');
      return;
    }

    try {
      const response = await fetch(`/api/batches/${editingBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Lote atualizado com sucesso!');
        setShowEditModal(false);
        setEditingBatch(null);
        setFormData({ name: '', description: '', status: 'active' });
        fetchBatches();
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar lote:', error);
      alert('❌ Erro ao atualizar lote');
    }
  };

  // Deletar lotes selecionados
  const handleDelete = async () => {
    if (selectedBatches.length === 0) {
      alert('Selecione pelo menos um lote para deletar');
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar ${selectedBatches.length} lote(s)? Os produtos associados não serão deletados.`)) {
      return;
    }

    try {
      const response = await fetch('/api/batches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBatches })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Lote(s) deletado(s) com sucesso!');
        setSelectedBatches([]);
        fetchBatches();
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao deletar lotes:', error);
      alert('❌ Erro ao deletar lotes');
    }
  };

  // Abrir modal de edição
  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      description: batch.description || '',
      status: batch.status
    });
    setShowEditModal(true);
  };

  // Toggle seleção de lote
  const toggleSelection = (batchId: number) => {
    setSelectedBatches(prev => 
      prev.includes(batchId) 
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  return (
    <Layout title="Lotes de Importação" subtitle="Gerencie lotes de produtos importados">
      <div className="space-y-6">
        {/* Barra de Ações */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar lotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="archived">Arquivados</option>
            </select>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Lote
              </Button>

              {selectedBatches.length > 0 && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar ({selectedBatches.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Lotes */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando lotes...
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center">
              <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum lote encontrado</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Lote
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedBatches.length === batches.length && batches.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches(batches.map(b => b.id));
                          } else {
                            setSelectedBatches([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome do Lote
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Anymarket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Otimizado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBatches.includes(batch.id)}
                          onChange={() => toggleSelection(batch.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <Layers className="h-5 w-5 text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">{batch.name}</div>
                            <div className="text-xs text-gray-500">ID: {batch.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {batch.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {batch.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            <Archive className="h-3 w-3 mr-1" />
                            Arquivado
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm">
                          <Package className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="font-medium text-gray-900">
                            {batch.actual_product_count}
                          </span>
                          <span className="text-gray-500 ml-1">produtos</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm">
                          <ShoppingCart className="h-4 w-4 text-purple-500 mr-1" />
                          <span className="font-medium text-purple-700">
                            {batch.anymarket_count || 0}
                          </span>
                          <span className="text-gray-500 ml-1">produtos</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="font-medium text-green-700">
                            {batch.optimized_count || 0}
                          </span>
                          <span className="text-gray-500 ml-1">completo</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(batch.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => openEditModal(batch)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Criar Novo Lote</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Lote *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Importação Janeiro 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional do lote..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'archived' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Criar Lote
              </Button>
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', description: '', status: 'active' });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar Lote</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Lote *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Importação Janeiro 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional do lote..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'archived' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Salvar Alterações
              </Button>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBatch(null);
                  setFormData({ name: '', description: '', status: 'active' });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


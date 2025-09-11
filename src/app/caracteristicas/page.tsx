'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import Layout from '@/components/Layout';

interface Caracteristica {
  id: number;
  caracteristica: string;
  pergunta_ia: string;
  valores_possiveis?: string;
  is_active: boolean;
  categorias?: string; // IDs das categorias separados por vírgula
  created_at: string;
  updated_at: string;
}

interface Categoria {
  id: number;
  vtex_id: number;
  name: string;
  father_category_id?: number;
  title?: string;
  is_active: boolean;
  has_children: boolean;
}

interface Relacionamento {
  id: number;
  caracteristica_id: number;
  categoria_id: number;
  is_active: boolean;
  caracteristica: string;
  categoria_name: string;
  categoria_vtex_id: number;
}

export default function CaracteristicasPage() {
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCaracteristica, setEditingCaracteristica] = useState<Caracteristica | null>(null);
  const [formData, setFormData] = useState({
    caracteristica: '',
    pergunta_ia: '',
    valores_possiveis: '',
    is_active: true,
    categorias_selecionadas: [] as number[]
  });

  // Buscar características
  const fetchCaracteristicas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/caracteristicas');
      if (response.ok) {
        const data = await response.json();
        setCaracteristicas(data.caracteristicas || []);
      }
    } catch (error) {
      console.error('Erro ao buscar características:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar categorias
  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categories-vtex?is_active=true');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };


  useEffect(() => {
    fetchCaracteristicas();
    fetchCategorias();
  }, []);

  // Salvar característica
  const saveCaracteristica = async () => {
    try {
      // Validação
      if (!formData.caracteristica.trim()) {
        alert('Nome da característica é obrigatório');
        return;
      }
      
      if (!formData.pergunta_ia.trim()) {
        alert('Pergunta é obrigatória');
        return;
      }
      
      if (formData.categorias_selecionadas.length === 0) {
        alert('Selecione pelo menos uma categoria');
        return;
      }

      const url = editingCaracteristica 
        ? `/api/caracteristicas/${editingCaracteristica.id}`
        : '/api/caracteristicas';
      
      const method = editingCaracteristica ? 'PUT' : 'POST';
      
      // Converter IDs internos para vtex_ids
      const vtexIds = formData.categorias_selecionadas.map(id => {
        const categoria = categorias.find(c => c.id === id);
        return categoria ? categoria.vtex_id : null;
      }).filter(id => id !== null);

      // Dados da característica (com categorias usando vtex_id)
      const caracteristicaData = {
        caracteristica: formData.caracteristica,
        pergunta_ia: formData.pergunta_ia,
        valores_possiveis: formData.valores_possiveis,
        is_active: formData.is_active,
        categorias: vtexIds.join(',')
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(caracteristicaData),
      });

      if (response.ok) {
        const result = await response.json();
        const caracteristicaId = editingCaracteristica ? editingCaracteristica.id : result.data?.id;
        
        // Categorias já foram salvas na coluna categorias da característica
        
        await fetchCaracteristicas();
        closeModal();
      } else {
        const error = await response.json();
        alert('Erro ao salvar: ' + error.message);
      }
    } catch (error) {
      console.error('Erro ao salvar característica:', error);
      alert('Erro ao salvar característica');
    }
  };

  // Deletar característica
  const deleteCaracteristica = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta característica?')) {
      return;
    }

    try {
      const response = await fetch(`/api/caracteristicas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCaracteristicas();
      } else {
        const error = await response.json();
        alert('Erro ao deletar: ' + error.message);
      }
    } catch (error) {
      console.error('Erro ao deletar característica:', error);
      alert('Erro ao deletar característica');
    }
  };

  // Toggle ativo/inativo
  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/caracteristicas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        await fetchCaracteristicas();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  // Abrir modal para edição
  const openEditModal = (caracteristica: Caracteristica) => {
    setEditingCaracteristica(caracteristica);
    
    // Buscar categorias selecionadas para esta característica (converter vtex_id para id interno)
    const categoriasSelecionadas = caracteristica.categorias 
      ? caracteristica.categorias.split(',').map(vtexId => {
          const categoria = categorias.find(c => c.vtex_id === parseInt(vtexId.trim()));
          return categoria ? categoria.id : null;
        }).filter((id): id is number => id !== null)
      : [];
    
    setFormData({
      caracteristica: caracteristica.caracteristica,
      pergunta_ia: caracteristica.pergunta_ia,
      valores_possiveis: caracteristica.valores_possiveis || '',
      is_active: caracteristica.is_active,
      categorias_selecionadas: categoriasSelecionadas
    });
    setShowModal(true);
  };

  // Abrir modal para nova característica
  const openNewModal = () => {
    setEditingCaracteristica(null);
    setFormData({
      caracteristica: '',
      pergunta_ia: '',
      valores_possiveis: '',
      is_active: true,
      categorias_selecionadas: []
    });
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCaracteristica(null);
    setFormData({
      caracteristica: '',
      pergunta_ia: '',
      valores_possiveis: '',
      is_active: true,
      categorias_selecionadas: []
    });
  };

  // Toggle categoria selecionada
  const toggleCategoria = (categoriaId: number) => {
    setFormData(prev => ({
      ...prev,
      categorias_selecionadas: prev.categorias_selecionadas.includes(categoriaId)
        ? prev.categorias_selecionadas.filter(id => id !== categoriaId)
        : [...prev.categorias_selecionadas, categoriaId]
    }));
  };

  // Selecionar todas as categorias
  const selecionarTodas = () => {
    setFormData(prev => ({
      ...prev,
      categorias_selecionadas: categorias.map(c => c.id)
    }));
  };

  // Desmarcar todas as categorias
  const desmarcarTodas = () => {
    setFormData(prev => ({
      ...prev,
      categorias_selecionadas: []
    }));
  };

  // Ordenar características por característica
  const sortedCaracteristicas = [...caracteristicas].sort((a, b) => {
    return a.caracteristica.localeCompare(b.caracteristica);
  });

  if (loading) {
    return (
      <Layout title="Características" subtitle="Carregando...">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Carregando características...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Características" subtitle="Gerencie as características para análise de produtos">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Características</h1>
          <p className="text-gray-600">Gerencie as características para análise de produtos</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Característica
        </button>
      </div>

      {/* Lista de Características */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {sortedCaracteristicas.map((caracteristica) => (
            <div key={caracteristica.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{caracteristica.caracteristica}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      caracteristica.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {caracteristica.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Pergunta:</strong> {caracteristica.pergunta_ia}
                  </p>
                  
                  {caracteristica.valores_possiveis && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Valores possíveis:</strong> {caracteristica.valores_possiveis}
                    </p>
                  )}
                  
                  {/* Categorias aplicáveis */}
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Categorias aplicáveis:</strong>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {caracteristica.categorias ? (
                        caracteristica.categorias.split(',').map(vtexId => {
                          const categoria = categorias.find(c => c.vtex_id === parseInt(vtexId.trim()));
                          return categoria ? (
                            <span
                              key={categoria.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {categoria.name}
                            </span>
                          ) : null;
                        }).filter(Boolean)
                      ) : (
                        <span className="text-xs text-gray-500 italic">Nenhuma categoria selecionada</span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Criada em: {new Date(caracteristica.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleActive(caracteristica.id, caracteristica.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      caracteristica.is_active
                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                    title={caracteristica.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {caracteristica.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => openEditModal(caracteristica)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteCaracteristica(caracteristica.id)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCaracteristica ? 'Editar Característica' : 'Nova Característica'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Característica *
                  </label>
                  <input
                    type="text"
                    value={formData.caracteristica}
                    onChange={(e) => setFormData({ ...formData, caracteristica: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: Cor Principal, Tipo de Manga, Material"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pergunta *
                  </label>
                  <textarea
                    value={formData.pergunta_ia}
                    onChange={(e) => setFormData({ ...formData, pergunta_ia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ex: Qual é a cor predominante desta peça de roupa? Analise cuidadosamente as imagens e identifique a cor mais visível."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valores possíveis
                  </label>
                  <textarea
                    value={formData.valores_possiveis}
                    onChange={(e) => setFormData({ ...formData, valores_possiveis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={2}
                    placeholder="Ex: Vermelho, Azul, Verde, Preto, Branco (separados por vírgula)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separe os valores por vírgula. Ex: Vermelho, Azul, Verde
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Categorias Aplicáveis *
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={selecionarTodas}
                        className="text-xs px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
                        title="Selecionar todas as categorias"
                      >
                        ✓ Todas
                      </button>
                      <button
                        type="button"
                        onClick={desmarcarTodas}
                        className="text-xs px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
                        title="Desmarcar todas as categorias"
                      >
                        ✗ Nenhuma
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                    {categorias.length === 0 ? (
                      <p className="text-sm text-gray-500">Carregando categorias...</p>
                    ) : (
                      <div className="space-y-2">
                        {categorias.map((categoria) => (
                          <label key={categoria.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.categorias_selecionadas.includes(categoria.id)}
                              onChange={() => toggleCategoria(categoria.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {categoria.name}
                              {categoria.title && categoria.title !== categoria.name && (
                                <span className="text-gray-500 ml-1">({categoria.title})</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Selecione as categorias onde esta característica será aplicada
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      {formData.categorias_selecionadas.length} de {categorias.length} selecionadas
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Característica ativa
                  </label>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCaracteristica}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Settings, MessageSquare, List, Tag } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
  id: number; // id_categories_vtex
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
      
      // Os IDs já são os vtex_ids (id_categories_vtex)
      const vtexIds = formData.categorias_selecionadas;

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
    
    // Buscar categorias selecionadas para esta característica
    const categoriasSelecionadas = caracteristica.categorias 
      ? caracteristica.categorias.split(',').map(vtexId => parseInt(vtexId.trim())).filter(id => !isNaN(id))
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

  const renderSkeletonCards = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <Card key={index} className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1 min-w-0 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex space-x-0.5">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    ));
  };

  if (loading) {
    return (
      <Layout title="Características" subtitle="Gerencie as características para análise de produtos">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Características</h1>
            <p className="text-muted-foreground">Gerencie as características para análise de produtos</p>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Nova Característica
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {renderSkeletonCards()}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Características" subtitle="Gerencie as características para análise de produtos">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Características</h1>
          <p className="text-muted-foreground">Gerencie as características para análise de produtos</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Característica
        </Button>
      </div>

      {/* Grid de Cards de Características */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedCaracteristicas.map((caracteristica) => (
          <Card key={caracteristica.id} className="group hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* Ícone da característica */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    caracteristica.is_active 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Settings className="w-4 h-4" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm leading-tight truncate">
                      {caracteristica.caracteristica}
                    </CardTitle>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <Badge 
                        variant={caracteristica.is_active ? "default" : "secondary"}
                        className="text-xs h-5"
                      >
                        <div className={`w-1 h-1 rounded-full mr-1 ${
                          caracteristica.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        {caracteristica.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Menu de Ações */}
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(caracteristica.id, caracteristica.is_active)}
                    className="h-6 w-6 p-0"
                    title={caracteristica.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {caracteristica.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(caracteristica)}
                    className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="Editar"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCaracteristica(caracteristica.id)}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                    title="Deletar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3 p-4">
              {/* Pergunta */}
              <div className="bg-muted/50 rounded-lg p-2 border">
                <div className="flex items-center space-x-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <h4 className="font-medium text-xs">Pergunta IA</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {caracteristica.pergunta_ia}
                </p>
              </div>
              
              {/* Valores Possíveis */}
              {caracteristica.valores_possiveis && (
                <div className="bg-muted/50 rounded-lg p-2 border">
                  <div className="flex items-center space-x-1 mb-1">
                    <List className="w-3 h-3 text-blue-600" />
                    <h4 className="font-medium text-xs">Valores</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
                    {caracteristica.valores_possiveis}
                  </p>
                </div>
              )}
              
              {/* Categorias */}
              <div className="bg-muted/50 rounded-lg p-2 border">
                <div className="flex items-center space-x-1 mb-1">
                  <Tag className="w-3 h-3 text-green-600" />
                  <h4 className="font-medium text-xs">Categorias</h4>
                </div>
                
                {caracteristica.categorias ? (
                  <div className="flex flex-wrap gap-1">
                    {caracteristica.categorias.split(',').slice(0, 3).map(vtexId => {
                      const categoria = categorias.find(c => c.id === parseInt(vtexId.trim()));
                      return categoria ? (
                        <Badge
                          key={categoria.id}
                          variant="outline"
                          className="text-xs h-4 px-1"
                        >
                          {categoria.name.length > 12 ? categoria.name.substring(0, 12) + '...' : categoria.name}
                        </Badge>
                      ) : null;
                    }).filter(Boolean)}
                    {caracteristica.categorias.split(',').length > 3 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        +{caracteristica.categorias.split(',').length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma categoria</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-hidden"
          aria-describedby="caracteristicas-description"
        >
          <DialogHeader>
            <DialogTitle>
              {editingCaracteristica ? 'Editar Característica' : 'Nova Característica'}
            </DialogTitle>
          </DialogHeader>

          <p 
            id="caracteristicas-description"
            className="text-sm text-gray-600 px-6 pb-4"
          >
            {editingCaracteristica ? 'Edite as informações da característica' : 'Crie uma nova característica para produtos'}
          </p>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Característica *
                </label>
                <Input
                  type="text"
                  value={formData.caracteristica}
                  onChange={(e) => setFormData({ ...formData, caracteristica: e.target.value })}
                  placeholder="Ex: Cor Principal, Tipo de Manga, Material"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Pergunta *
                </label>
                <Textarea
                  value={formData.pergunta_ia}
                  onChange={(e) => setFormData({ ...formData, pergunta_ia: e.target.value })}
                  rows={3}
                  placeholder="Ex: Qual é a cor predominante desta peça de roupa? Analise cuidadosamente as imagens e identifique a cor mais visível."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Valores possíveis
                </label>
                <Textarea
                  value={formData.valores_possiveis}
                  onChange={(e) => setFormData({ ...formData, valores_possiveis: e.target.value })}
                  rows={2}
                  placeholder="Ex: Vermelho, Azul, Verde, Preto, Branco (separados por vírgula)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separe os valores por vírgula. Ex: Vermelho, Azul, Verde
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    Categorias Aplicáveis *
                  </label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selecionarTodas}
                      className="text-xs h-7"
                      title="Selecionar todas as categorias"
                    >
                      ✓ Todas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={desmarcarTodas}
                      className="text-xs h-7"
                      title="Desmarcar todas as categorias"
                    >
                      ✗ Nenhuma
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/50">
                  {categorias.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Carregando categorias...</p>
                  ) : (
                    <div className="space-y-2">
                      {categorias.map((categoria) => (
                        <label key={categoria.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.categorias_selecionadas.includes(categoria.id)}
                            onCheckedChange={() => toggleCategoria(categoria.id)}
                          />
                          <span className="text-sm">
                            {categoria.name}
                            {categoria.title && categoria.title !== categoria.name && (
                              <span className="text-muted-foreground ml-1">({categoria.title})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    Selecione as categorias onde esta característica será aplicada
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {formData.categorias_selecionadas.length} de {categorias.length} selecionadas
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Característica ativa
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={saveCaracteristica}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

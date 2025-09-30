'use client';

import { Search, Filter, RefreshCw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Filters {
  search?: string;
  brand_id?: number[];
  category_id?: number[];
  optimization_status?: string;
  has_anymarket_ref_id?: boolean;
  stock_operator?: string;
  stock_value?: number;
}

interface ProductFiltersProps {
  filters: Filters;
  brands: Brand[];
  categories: Category[];
  loadingBrands: boolean;
  loadingCategories: boolean;
  onFiltersChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
}

export function ProductFilters({
  filters,
  brands,
  categories,
  loadingBrands,
  loadingCategories,
  onFiltersChange,
  onClearFilters
}: ProductFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Filter className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle>Filtros e Busca</CardTitle>
              <p className="text-sm text-muted-foreground">
                Encontre produtos específicos usando os filtros abaixo
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Campo de Busca */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium mb-2">
            Buscar Produtos
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              id="search"
              placeholder="Digite o nome do produto, ref_id, marca ou categoria..."
              value={filters.search || ''}
              onChange={(e) => {
                onFiltersChange({ search: e.target.value });
              }}
              className="pl-10"
            />
          </div>
        </div>
      
        {/* Filtros */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Filtros Avançados</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            
            {/* Marca */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Marca
              </label>
              <Combobox
                options={brands?.map(brand => ({
                  value: String(brand.id),
                  label: brand.name
                })) || []}
                value={Array.isArray(filters.brand_id) ? filters.brand_id.map(String) : []}
                onValueChange={(selectedValues) => {
                  onFiltersChange({ brand_id: selectedValues.map(Number) });
                }}
                placeholder={loadingBrands ? "Carregando..." : "Selecionar marcas"}
                searchPlaceholder="Buscar marcas..."
                emptyText="Nenhuma marca encontrada."
                className="w-full"
              />
            </div>
            
            {/* Categoria */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <Combobox
                options={categories?.map(category => ({
                  value: String(category.id),
                  label: category.name
                })) || []}
                value={Array.isArray(filters.category_id) ? filters.category_id.map(String) : []}
                onValueChange={(selectedValues) => {
                  onFiltersChange({ category_id: selectedValues.map(Number) });
                }}
                placeholder={loadingCategories ? "Carregando..." : "Selecionar categorias"}
                searchPlaceholder="Buscar categorias..."
                emptyText="Nenhuma categoria encontrada."
                className="w-full"
              />
            </div>
            

            {/* Status de Otimizações */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status de Otimizações
              </label>
              <Select
                value={filters.optimization_status || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    onFiltersChange({ optimization_status: undefined });
                  } else {
                    onFiltersChange({ optimization_status: value });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="none">🚫 Sem Otimizações</SelectItem>
                  <SelectItem value="partial">⚠️ Otimização Parcial</SelectItem>
                  <SelectItem value="complete">✅ Totalmente Otimizado</SelectItem>
                  <SelectItem value="analysis_only">🖼️ Só Análise</SelectItem>
                  <SelectItem value="anymarket_only">🔄 Só Anymarket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            
            {/* Anymarket */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Anymarket
              </label>
              <Select
                value={filters.has_anymarket_ref_id === true ? 'true' : filters.has_anymarket_ref_id === false ? 'false' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    onFiltersChange({ has_anymarket_ref_id: undefined });
                  } else if (value === 'true') {
                    onFiltersChange({ has_anymarket_ref_id: true });
                  } else {
                    onFiltersChange({ has_anymarket_ref_id: false });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">🔄 Com Referência</SelectItem>
                  <SelectItem value="false">❌ Sem Referência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            

            {/* Filtro de Estoque */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Estoque
              </label>
              <div className="flex space-x-2">
                <Select
                  value={filters.stock_operator || ''}
                  onValueChange={(value) => {
                    onFiltersChange({ 
                      stock_operator: value || undefined,
                      stock_value: value ? filters.stock_value : undefined
                    });
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Op" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">&gt;</SelectItem>
                    <SelectItem value=">=">&gt;=</SelectItem>
                    <SelectItem value="=">=</SelectItem>
                    <SelectItem value="<">&lt;</SelectItem>
                    <SelectItem value="<=">&lt;=</SelectItem>
                    <SelectItem value="!=">!=</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.stock_value || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    onFiltersChange({ stock_value: value });
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

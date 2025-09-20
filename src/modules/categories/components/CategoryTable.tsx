'use client';

import { useState } from 'react';
import { Category, CategorySortOptions } from '../types';
import { 
  formatNumber, 
  getCategoryStatusColor, 
  getCategoryStatusText
} from '../utils/formatters';
import { 
  Eye, Trash2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, Folder,
  Search, Filter, MoreHorizontal, Settings2, Download
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCategories: number;
  itemsPerPage: number;
  sort: CategorySortOptions;
  selectedCategories: number[];
  searchTerm?: string;
  onSort: (field: CategorySortOptions['field']) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  onCategorySelect: (id: number) => void;
  onSelectAll: () => void;
  onViewCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onSearchChange?: (term: string) => void;
  onExport?: () => void;
}

export function CategoryTable({
  categories,
  loading,
  currentPage,
  totalPages,
  totalCategories,
  itemsPerPage,
  sort,
  selectedCategories,
  searchTerm = "",
  onSort,
  onPageChange,
  onItemsPerPageChange,
  onCategorySelect,
  onSelectAll,
  onViewCategory,
  onEditCategory,
  onDeleteCategory,
  onSearchChange,
  onExport
}: CategoryTableProps) {
  

  const getSortIcon = (field: CategorySortOptions['field']) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: itemsPerPage }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
        <TableCell>
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border shadow-sm bg-card">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma categoria encontrada</h3>
          <p className="text-muted-foreground">Tente ajustar os filtros ou importar novas categorias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border shadow-sm bg-card">
      {/* Header com pesquisa e ações */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4 flex-1">
          {onSearchChange && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar categorias..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCategories.length} selecionada(s)
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Itens por página</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[10, 20, 50, 100].map((limit) => (
                <DropdownMenuCheckboxItem
                  key={limit}
                  checked={itemsPerPage === limit}
                  onCheckedChange={() => onItemsPerPageChange(limit)}
                >
                  {limit} itens
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCategories.length === categories.length && categories.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('vtex_id')}
              >
                <div className="flex items-center space-x-2">
                  <span>ID</span>
                  {getSortIcon('vtex_id')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center space-x-2">
                  <span>Nome</span>
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('product_count')}
              >
                <div className="flex items-center space-x-2">
                  <span>Produtos</span>
                  {getSortIcon('product_count')}
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? renderSkeletonRows() : categories.map((category) => (
              <TableRow key={category.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => onCategorySelect(category.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <span className="text-muted-foreground">#{category.id}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {category.has_children ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{category.name}</span>
                    {category.parent_name && (
                      <Badge variant="outline" className="text-xs">
                        {category.parent_name}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">{formatNumber(category.product_count)}</span>
                    <span className="text-muted-foreground text-sm">produtos</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={category.is_active ? "default" : "secondary"}
                    className={`${getCategoryStatusColor(category.is_active)} ${
                      category.is_active 
                        ? "bg-green-100 text-green-800 hover:bg-green-200" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {getCategoryStatusText(category.is_active)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewCategory(category)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      title="Visualizar categoria"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteCategory(category)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      title="Excluir categoria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/50">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCategories)} de {totalCategories} categorias
          </span>
          {selectedCategories.length > 0 && (
            <Badge variant="secondary">
              {selectedCategories.length} selecionada(s)
            </Badge>
          )}
        </div>
        
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) onPageChange(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {/* Lógica de paginação inteligente */}
              {(() => {
                const pages = [];
                const maxVisiblePages = 7;
                
                if (totalPages <= maxVisiblePages) {
                  // Mostrar todas as páginas se houver poucas
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(i);
                          }}
                          isActive={i === currentPage}
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                } else {
                  // Lógica para muitas páginas
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, currentPage + 2);
                  
                  // Primeira página
                  if (startPage > 1) {
                    pages.push(
                      <PaginationItem key={1}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(1);
                          }}
                          isActive={1 === currentPage}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    );
                    
                    if (startPage > 2) {
                      pages.push(
                        <PaginationItem key="ellipsis1">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                  }
                  
                  // Páginas do meio
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(i);
                          }}
                          isActive={i === currentPage}
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // Última página
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <PaginationItem key="ellipsis2">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    pages.push(
                      <PaginationItem key={totalPages}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(totalPages);
                          }}
                          isActive={totalPages === currentPage}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                }
                
                return pages;
              })()}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) onPageChange(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

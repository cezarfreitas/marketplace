'use client';

import { useState } from 'react';
import { Brand, BrandSortOptions } from '../types';
import { formatDate, formatNumber, getBrandImageUrl } from '../utils/formatters';
import { 
  Eye, Trash2, MoreVertical, Star, StarOff, ExternalLink, Copy, 
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Bot, Download,
  Search, Filter, MoreHorizontal, Settings2
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

interface BrandTableProps {
  brands: Brand[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalBrands: number;
  itemsPerPage: number;
  sort: BrandSortOptions;
  selectedBrands: number[];
  searchTerm?: string;
  onSort: (field: BrandSortOptions['field']) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  onBrandSelect: (id: number) => void;
  onSelectAll: () => void;
  onViewBrand: (brand: Brand) => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onGenerateContext: (brand: Brand) => void;
  onSearchChange?: (term: string) => void;
  onExport?: () => void;
}

export function BrandTable({
  brands,
  loading,
  currentPage,
  totalPages,
  totalBrands,
  itemsPerPage,
  sort,
  selectedBrands,
  searchTerm = "",
  onSort,
  onPageChange,
  onItemsPerPageChange,
  onBrandSelect,
  onSelectAll,
  onViewBrand,
  onEditBrand,
  onDeleteBrand,
  onGenerateContext,
  onSearchChange,
  onExport
}: BrandTableProps) {

  const getSortIcon = (field: BrandSortOptions['field']) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sort.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-primary" /> : 
      <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: itemsPerPage }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 rounded-full mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-full mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell>
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  if (brands.length === 0 && !loading) {
    return (
      <div className="rounded-xl border shadow-sm bg-card">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma marca encontrada</h3>
          <p className="text-muted-foreground">Tente ajustar os filtros ou importar novas marcas.</p>
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
                placeholder="Pesquisar marcas..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {selectedBrands.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedBrands.length} selecionada(s)
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
                  checked={selectedBrands.length === brands.length && brands.length > 0}
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
                  <span>Marca</span>
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">Título</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-center"
                onClick={() => onSort('product_count')}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Produtos</span>
                  {getSortIcon('product_count')}
                </div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center space-x-2">
                  <span>Criado</span>
                  {getSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? renderSkeletonRows() : brands.map((brand) => (
              <TableRow key={brand.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedBrands.includes(brand.id)}
                    onCheckedChange={() => onBrandSelect(brand.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <span className="text-muted-foreground">#{brand.id}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {brand.image_url ? (
                        <img
                          src={getBrandImageUrl(brand)}
                          alt={brand.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground font-semibold text-sm">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium truncate">
                          {brand.name}
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500" title="Marca ativa"></div>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        ID: {brand.id}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="truncate block max-w-xs text-muted-foreground">
                    {brand.title || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                    {formatNumber(brand.product_count || 0)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={brand.is_active ? "default" : "secondary"}
                    className={`${
                      brand.is_active 
                        ? "bg-green-100 text-green-800 hover:bg-green-200" 
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }`}
                  >
                    {brand.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{formatDate(brand.created_at).split(',')[0]}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(brand.created_at).split(',')[1]?.trim()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewBrand(brand)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      title="Visualizar marca"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGenerateContext(brand)}
                      className={`h-8 w-8 p-0 ${
                        brand.contexto && brand.contexto.trim() 
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50 bg-green-50' 
                          : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                      }`}
                      title={brand.contexto && brand.contexto.trim() ? "Contexto já gerado - Clique para editar" : "Gerar contexto de marca com IA"}
                    >
                      <Bot className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteBrand(brand)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      title="Excluir marca"
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
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalBrands)} de {totalBrands} marcas
          </span>
          {selectedBrands.length > 0 && (
            <Badge variant="secondary">
              {selectedBrands.length} selecionada(s)
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
'use client';

import { useState, useEffect } from 'react';

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

export function useFiltersData() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      setError(null);
      
      const response = await fetch('/api/filters/brands');
      const data = await response.json();
      
      if (data.success) {
        setBrands(data.data || []);
      } else {
        throw new Error(data.message || 'Erro ao carregar marcas');
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar marcas');
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setError(null);
      
      const response = await fetch('/api/filters/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data || []);
      } else {
        throw new Error(data.message || 'Erro ao carregar categorias');
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const refetchData = () => {
    fetchBrands();
    fetchCategories();
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []);

  return {
    brands,
    categories,
    loadingBrands,
    loadingCategories,
    error,
    refetchData
  };
}

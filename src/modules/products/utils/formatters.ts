import { Product } from '../types';

/**
 * Formatar data para exibição
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Formatar número com separadores de milhares
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Truncar texto com ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Formatar status do produto
 */
export function formatProductStatus(product: Product): {
  active: { label: string; color: string; icon: string };
  visible: { label: string; color: string; icon: string };
} {
  return {
    active: {
      label: product.is_active ? 'Ativo' : 'Inativo',
      color: product.is_active ? 'green' : 'red',
      icon: product.is_active ? '✓' : '✗'
    },
    visible: {
      label: product.is_visible ? 'Visível' : 'Oculto',
      color: product.is_visible ? 'blue' : 'gray',
      icon: product.is_visible ? '👁️' : '🙈'
    }
  };
}

/**
 * Gerar URL da imagem do produto
 */
export function getProductImageUrl(product: Product, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!product.main_image) {
    return '/placeholder-product.png';
  }

  // Se já tem protocolo, retorna como está
  if (product.main_image.startsWith('http')) {
    return product.main_image;
  }

  // Adiciona protocolo se necessário
  return `https://projetoinfluencer.${product.main_image}`;
}

/**
 * Gerar slug do produto para URLs
 */
export function generateProductSlug(product: Product): string {
  return product.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Validar se produto tem dados completos
 */
export function validateProductCompleteness(product: Product): {
  isComplete: boolean;
  missingFields: string[];
  completeness: number;
} {
  const requiredFields = [
    'name',
    'description',
    'title',
    'brand_id',
    'category_id'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = product[field as keyof Product];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  const completeness = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completeness
  };
}

/**
 * Gerar resumo do produto
 */
export function generateProductSummary(product: Product): string {
  const { completeness } = validateProductCompleteness(product);
  
  const parts = [
    `${product.name}`,
    product.brand_name ? `Marca: ${product.brand_name}` : null,
    product.category_name ? `Categoria: ${product.category_name}` : null,
    `${product.sku_count || 0} SKUs`,
    `${product.image_count || 0} imagens`,
    `${completeness}% completo`
  ].filter(Boolean);

  return parts.join(' • ');
}

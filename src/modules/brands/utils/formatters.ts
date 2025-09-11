import { Brand } from '../types';

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
 * Formatar status da marca
 */
export function formatBrandStatus(brand: Brand): {
  active: { label: string; color: string; icon: string };
  auxiliary: { label: string; color: string; icon: string };
} {
  return {
    active: {
      label: brand.is_active ? 'Ativa' : 'Inativa',
      color: brand.is_active ? 'green' : 'red',
      icon: brand.is_active ? '✓' : '✗'
    },
    auxiliary: {
      label: brand.auxiliary_data_generated ? 'Gerados' : 'Pendentes',
      color: brand.auxiliary_data_generated ? 'blue' : 'orange',
      icon: brand.auxiliary_data_generated ? '📊' : '⏳'
    }
  };
}

/**
 * Gerar URL da imagem da marca
 */
export function getBrandImageUrl(brand: Brand, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!brand.image_url) {
    return '/placeholder-brand.png';
  }

  // Se já tem protocolo, retorna como está
  if (brand.image_url.startsWith('http')) {
    return brand.image_url;
  }

  // Adiciona protocolo se necessário
  return `https://projetoinfluencer.${brand.image_url}`;
}

/**
 * Gerar slug da marca para URLs
 */
export function generateBrandSlug(brand: Brand): string {
  return brand.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Validar se marca tem dados completos
 */
export function validateBrandCompleteness(brand: Brand): {
  isComplete: boolean;
  missingFields: string[];
  completeness: number;
} {
  const requiredFields = [
    'name',
    'title',
    'meta_tag_description'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = brand[field as keyof Brand];
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
 * Gerar resumo da marca
 */
export function generateBrandSummary(brand: Brand): string {
  const { completeness } = validateBrandCompleteness(brand);
  
  const parts = [
    `${brand.name}`,
    brand.title ? `Título: ${brand.title}` : null,
    `${brand.product_count || 0} produtos`,
    `${completeness}% completo`,
    brand.auxiliary_data_generated ? 'Dados auxiliares gerados' : 'Dados auxiliares pendentes'
  ].filter(Boolean);

  return parts.join(' • ');
}

/**
 * Formatar dados auxiliares da marca
 */
export function formatAuxiliaryData(brand: Brand): {
  hasSeoData: boolean;
  hasBrandStory: boolean;
  hasTargetData: boolean;
  hasVisualData: boolean;
  totalFields: number;
  completedFields: number;
} {
  const seoFields = [brand.seo_title, brand.seo_description, brand.seo_keywords];
  const storyFields = [brand.brand_story, brand.brand_values, brand.brand_personality];
  const targetFields = [brand.target_audience, brand.target_demographics, brand.consumption_behavior];
  const visualFields = [brand.visual_style, brand.visual_identity, brand.brand_voice_tone];

  const allFields = [...seoFields, ...storyFields, ...targetFields, ...visualFields];
  const completedFields = allFields.filter(field => field && field.trim() !== '').length;

  return {
    hasSeoData: seoFields.some(field => field && field.trim() !== ''),
    hasBrandStory: storyFields.some(field => field && field.trim() !== ''),
    hasTargetData: targetFields.some(field => field && field.trim() !== ''),
    hasVisualData: visualFields.some(field => field && field.trim() !== ''),
    totalFields: allFields.length,
    completedFields
  };
}

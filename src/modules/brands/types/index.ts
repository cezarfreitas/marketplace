// Tipos específicos para o módulo de marcas
export interface Brand {
  id: number;
  vtex_id: number;
  name: string;
  is_active: boolean;
  title?: string;
  meta_tag_description?: string;
  image_url?: string;
  contexto?: string;
  brand_history?: string;
  target_audience?: string;
  language_type?: string;
  consumption_behavior?: string;
  visual_style?: string;
  auxiliary_data_generated: boolean;
  // Campos SEO e informações ricas
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  brand_story?: string;
  brand_values?: string;
  target_demographics?: string;
  brand_personality?: string;
  competitive_advantages?: string;
  product_categories?: string;
  price_positioning?: string;
  brand_voice_tone?: string;
  visual_identity?: string;
  content_suggestions?: string;
  brand_analysis?: string;
  created_at: Date;
  updated_at: Date;
  // Campos calculados
  product_count?: number;
}

export interface BrandFilters {
  search: string;
  is_active: string;
  auxiliary_data_generated: string;
}

export interface BrandListResponse {
  success: boolean;
  data: {
    brands: Brand[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    search: string;
  };
}

export interface CreateBrandRequest {
  vtex_id: number;
  name: string;
  is_active: boolean;
  title?: string;
  meta_tag_description?: string;
  image_url?: string;
}

export interface UpdateBrandRequest extends Partial<CreateBrandRequest> {
  id: number;
}

export interface BrandSortOptions {
  field: 'name' | 'created_at' | 'updated_at' | 'vtex_id' | 'product_count';
  direction: 'asc' | 'desc';
}

export interface BrandPaginationOptions {
  page: number;
  limit: number;
  sort?: BrandSortOptions;
  filters?: BrandFilters;
}

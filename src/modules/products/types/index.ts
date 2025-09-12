// Tipos específicos para o módulo de produtos
export interface Product {
  id: number;
  vtex_id: number;
  name: string;
  department_id: number;
  category_id: number;
  brand_id: number;
  link_id: string;
  ref_id: string;
  is_visible: boolean;
  description: string;
  description_short: string;
  release_date: Date;
  keywords: string;
  title: string;
  is_active: boolean;
  tax_code: string;
  meta_tag_description: string;
  supplier_id: number;
  show_without_stock: boolean;
  adwords_remarketing_code: string;
  lomadee_campaign_code: string;
  score: number;
  commercial_condition_id: number;
  reward_value: number;
  estimated_date_arrival: Date;
  measurement_unit: string;
  unit_multiplier: number;
  information_source: string;
  modal_type: string;
  created_at: Date;
  updated_at: Date;
  // Campos básicos calculados
  brand_name?: string;
  category_name?: string;
  category_vtex_id?: number;
  department_name?: string;
  total_stock?: number;
  sku_count?: number;
  image_count?: number;
  main_image?: string;
  anymarket_id?: string;
}

export interface ProductFilters {
  search: string;
  brand_id: string | string[];
  category_id: string | string[];
  is_active: string;
  is_visible: string;
  has_image_analysis?: boolean;
  has_marketplace_description?: boolean;
  has_anymarket_ref_id?: boolean;
  has_anymarket_sync_log?: boolean;
  has_images?: boolean;
  stock_operator?: string;
  stock_value?: number;
}

export interface ProductListResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    search: string;
  };
}

export interface CreateProductRequest {
  vtex_id: number;
  name: string;
  department_id: number;
  category_id: number;
  brand_id: number;
  link_id: string;
  ref_id: string;
  is_visible: boolean;
  description: string;
  description_short: string;
  release_date: Date;
  keywords: string;
  title: string;
  is_active: boolean;
  tax_code: string;
  meta_tag_description: string;
  supplier_id: number;
  show_without_stock: boolean;
  adwords_remarketing_code: string;
  lomadee_campaign_code: string;
  score: number;
  commercial_condition_id: number;
  reward_value: number;
  estimated_date_arrival: Date;
  measurement_unit: string;
  unit_multiplier: number;
  information_source: string;
  modal_type: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

export interface ProductSortOptions {
  field: 'name' | 'created_at' | 'updated_at' | 'vtex_id' | 'brand_name' | 'category_name' | 'image_count' | 'total_stock';
  direction: 'asc' | 'desc';
}

export interface ProductPaginationOptions {
  page: number;
  limit: number;
  sort?: ProductSortOptions;
  filters?: ProductFilters;
}

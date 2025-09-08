export interface Category {
  id: number;
  vtex_id: number;
  name: string;
  father_category_id?: number;
  title?: string;
  description?: string;
  keywords?: string;
  is_active: boolean;
  lomadee_campaign_code?: string;
  adwords_remarketing_code?: string;
  show_in_store_front: boolean;
  show_brand_filter: boolean;
  active_store_front_link: boolean;
  global_category_id?: number;
  stock_keeping_unit_selection_mode?: string;
  score?: number;
  link_id?: string;
  has_children: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
  parent_name?: string;
}

export interface CategoryFilters {
  search: string;
  is_active: string;
  has_children: string;
}

export interface CategorySortOptions {
  field: 'name' | 'created_at' | 'updated_at' | 'vtex_id' | 'product_count';
  direction: 'asc' | 'desc';
}

export interface CategoryPaginationOptions {
  page: number;
  limit: number;
  sort?: CategorySortOptions;
  filters?: CategoryFilters;
}

export interface CategoryListResponse {
  success: boolean;
  data: {
    categories: Category[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    search: string;
    filters: {
      is_active: string;
      has_children: string;
    };
    sort: {
      field: string;
      direction: string;
    };
  };
  message?: string;
}

export interface CreateCategoryRequest {
  name: string;
  father_category_id?: number;
  title?: string;
  description?: string;
  keywords?: string;
  is_active?: boolean;
  lomadee_campaign_code?: string;
  adwords_remarketing_code?: string;
  show_in_store_front?: boolean;
  show_brand_filter?: boolean;
  active_store_front_link?: boolean;
  global_category_id?: number;
  stock_keeping_unit_selection_mode?: string;
  score?: number;
  link_id?: string;
  has_children?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: number;
}

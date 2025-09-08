// Tipos para o banco de dados MySQL
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
}

export interface Category {
  id: number;
  vtex_id: number;
  name: string;
  father_category_id: number;
  title: string;
  description: string;
  keywords: string;
  is_active: boolean;
  lomadee_campaign_code: string;
  adwords_remarketing_code: string;
  show_in_store_front: boolean;
  show_brand_filter: boolean;
  active_store_front_link: boolean;
  global_category_id: number;
  stock_keeping_unit_selection_mode: string;
  score: number;
  link_id: string;
  has_children: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Brand {
  id: number;
  vtex_id: number;
  name: string;
  is_active: boolean;
  title?: string;
  meta_tag_description?: string;
  image_url?: string;
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
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  function_type: string;
  model: string;
  max_tokens: number;
  temperature: number;
  system_prompt?: string;
  guidelines_template?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Sku {
  id: number;
  vtex_id: number;
  product_id: number;
  name_complete: string;
  complement_name: string;
  product_name: string;
  product_description: string;
  product_ref_id: string;
  tax_code: string;
  sku_name: string;
  is_active: boolean;
  is_transported: boolean;
  is_inventoried: boolean;
  is_gift_card_recharge: boolean;
  image_url: string;
  detail_url: string;
  csc_identification: string;
  brand_id: string;
  brand_name: string;
  manufacturer_code: string;
  is_kit: boolean;
  commercial_condition_id: number;
  reward_value: number;
  estimated_date_arrival: Date;
  measurement_unit: string;
  unit_multiplier: number;
  information_source: string;
  modal_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductSpecification {
  id: number;
  product_id: number;
  field_id: number;
  field_name: string;
  field_value_ids: string;
  is_filter: boolean;
  field_group_id: number;
  field_group_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  image_name: string;
  file_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductVideo {
  id: number;
  product_id: number;
  video_url: string;
  video_title: string;
  created_at: Date;
  updated_at: Date;
}

export interface ImportLog {
  id: number;
  import_type: 'products' | 'categories' | 'brands' | 'skus';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  failed_items: number;
  error_message: string;
  started_at: Date;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ImportItem {
  id: number;
  import_log_id: number;
  vtex_id: number;
  item_type: 'product' | 'category' | 'brand' | 'sku';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string;
  raw_data: string;
  created_at: Date;
  updated_at: Date;
}

// Tipos para inserção no banco
export interface CreateProduct {
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

export interface CreateCategory {
  vtex_id: number;
  name: string;
  father_category_id: number;
  title: string;
  description: string;
  keywords: string;
  is_active: boolean;
  lomadee_campaign_code: string;
  adwords_remarketing_code: string;
  show_in_store_front: boolean;
  show_brand_filter: boolean;
  active_store_front_link: boolean;
  global_category_id: number;
  stock_keeping_unit_selection_mode: string;
  score: number;
  link_id: string;
  has_children: boolean;
}

export interface CreateBrand {
  vtex_id: number;
  name: string;
  is_active: boolean;
  title?: string;
  meta_tag_description?: string;
  image_url?: string;
}

export interface CreateSku {
  vtex_id: number;
  product_id: number;
  name_complete: string;
  complement_name: string;
  product_name: string;
  product_description: string;
  product_ref_id: string;
  tax_code: string;
  sku_name: string;
  is_active: boolean;
  is_transported: boolean;
  is_inventoried: boolean;
  is_gift_card_recharge: boolean;
  image_url: string;
  detail_url: string;
  csc_identification: string;
  brand_id: string;
  brand_name: string;
  manufacturer_code: string;
  is_kit: boolean;
  commercial_condition_id: number;
  reward_value: number;
  estimated_date_arrival: Date;
  measurement_unit: string;
  unit_multiplier: number;
  information_source: string;
  modal_type: string;
}

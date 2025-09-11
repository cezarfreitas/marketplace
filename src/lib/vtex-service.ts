// Serviço de integração com a API da VTEX
export interface VTEXConfig {
  accountName: string;
  environment: string;
  appKey: string;
  appToken: string;
}

export interface VTEXProduct {
  Id: number;
  Name: string;
  DepartmentId: number;
  CategoryId: number;
  BrandId: number;
  LinkId: string;
  RefId: string;
  IsVisible: boolean;
  Description: string;
  DescriptionShort: string;
  ReleaseDate: string;
  KeyWords: string;
  Title: string;
  IsActive: boolean;
  TaxCode: string;
  MetaTagDescription: string;
  SupplierId: number;
  ShowWithoutStock: boolean;
  AdWordsRemarketingCode: string;
  LomadeeCampaignCode: string;
  Score: number;
}

export interface VTEXBrand {
  id: number;
  name: string;
  isActive: boolean;
  metaTagDescription?: string;
  imageUrl?: string;
  title?: string;
}

export interface VTEXCategory {
  Id: number;
  Name: string;
  FatherCategoryId: number;
  Title: string;
  Description: string;
  Keywords: string;
  IsActive: boolean;
  LomadeeCampaignCode: string;
  AdWordsRemarketingCode: string;
  ShowInStoreFront: boolean;
  ShowBrandFilter: boolean;
  ActiveStoreFrontLink: boolean;
  GlobalCategoryId: number;
  StockKeepingUnitSelectionMode: string;
  Score?: number;
  LinkId: string;
  HasChildren: boolean;
  TreePath?: string[];
  TreePathIds?: number[];
  TreePathLinkIds?: string[];
}

export interface VTEXSKU {
  IsPersisted: boolean;
  IsRemoved: boolean;
  Id: number;
  ProductId: number;
  IsActive: boolean;
  Name: string;
  Height?: number;
  RealHeight?: number;
  Width?: number;
  RealWidth?: number;
  Length?: number;
  RealLength?: number;
  WeightKg?: number;
  RealWeightKg?: number;
  ModalId: number;
  RefId: string;
  CubicWeight?: number;
  IsKit: boolean;
  IsDynamicKit?: boolean;
  InternalNote?: string;
  DateUpdated: string;
  RewardValue: number;
  CommercialConditionId: number;
  EstimatedDateArrival?: string;
  FlagKitItensSellApart: boolean;
  ManufacturerCode: string;
  ReferenceStockKeepingUnitId?: number;
  Position: number;
  EditionSkuId?: number;
  ApprovedAdminId: number;
  EditionAdminId: number;
  ActivateIfPossible: boolean;
  SupplierCode?: string;
  MeasurementUnit: string;
  UnitMultiplier: number;
  IsInventoried?: boolean;
  IsTransported?: boolean;
  IsGiftCardRecharge?: boolean;
  ModalType?: string;
}

export interface VTEXImage {
  Id: number;
  ArchiveId: number;
  SkuId: number;
  Name: string;
  IsMain: boolean;
  Label?: string;
  Text: string;
  Url: string;
  FileLocation: string;
  Position: number;
}

export interface VTEXStockBalance {
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  reservedQuantity: number;
  hasUnlimitedQuantity: boolean;
  timeToRefill: string | null;
  dateOfSupplyUtc: string | null;
  leadTime: string | null;
}

export interface VTEXStockResponse {
  skuId: string;
  balance: VTEXStockBalance[];
}

export class VTEXService {
  private config: VTEXConfig;
  private baseUrl: string;

  constructor(config: VTEXConfig) {
    this.config = config;
    this.baseUrl = `https://${config.accountName}.${config.environment}.com.br`;
  }

  public getConfig() {
    return this.config;
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-VTEX-API-AppKey': this.config.appKey,
      'X-VTEX-API-AppToken': this.config.appToken,
    };
  }

  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`VTEX API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição VTEX ${url}:`, error);
      throw error;
    }
  }

  /**
   * Buscar produto por ID
   */
  async getProduct(productId: number): Promise<VTEXProduct> {
    const url = `${this.baseUrl}/api/catalog/pvt/product/${productId}`;
    return this.makeRequest<VTEXProduct>(url);
  }

  /**
   * Buscar produto por RefId
   */
  async getProductByRefId(refId: string): Promise<VTEXProduct> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/products/productgetbyrefid/${refId}`;
    return this.makeRequest<VTEXProduct>(url);
  }

  /**
   * Buscar marca por ID
   */
  async getBrand(brandId: number): Promise<VTEXBrand> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/brand/${brandId}`;
    return this.makeRequest<VTEXBrand>(url);
  }

  /**
   * Buscar todas as marcas
   */
  async getBrands(): Promise<VTEXBrand[]> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/brand/list`;
    return this.makeRequest<VTEXBrand[]>(url);
  }

  /**
   * Buscar todos os produtos
   */
  async getProducts(): Promise<VTEXProduct[]> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/products/GetProductAndSkuIds`;
    return this.makeRequest<VTEXProduct[]>(url);
  }

  /**
   * Buscar todos os SKUs
   */
  async getSKUs(): Promise<VTEXSKU[]> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/stockkeepingunit`;
    return this.makeRequest<VTEXSKU[]>(url);
  }

  /**
   * Buscar categoria por ID
   */
  async getCategory(categoryId: number): Promise<VTEXCategory> {
    const url = `${this.baseUrl}/api/catalog/pvt/category/${categoryId}?includeTreePath=true`;
    return this.makeRequest<VTEXCategory>(url);
  }

  /**
   * Buscar todas as categorias
   */
  async getCategories(): Promise<VTEXCategory[]> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/category/tree/0`;
    return this.makeRequest<VTEXCategory[]>(url);
  }

  /**
   * Buscar SKUs por ID do produto
   */
  async getProductSKUs(productId: number): Promise<VTEXSKU[]> {
    const url = `${this.baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productId}`;
    return this.makeRequest<VTEXSKU[]>(url);
  }

  /**
   * Buscar imagens por ID do SKU
   */
  async getSKUImages(skuId: number): Promise<VTEXImage[]> {
    const url = `${this.baseUrl}/api/catalog/pvt/stockkeepingunit/${skuId}/file`;
    return this.makeRequest<VTEXImage[]>(url);
  }

  async getSKUStock(skuId: number): Promise<VTEXStockResponse | null> {
    try {
      const stockApiUrl = `${this.baseUrl}/api/logistics/pvt/inventory/skus/${skuId}`;
      
      const stockResponse = await fetch(stockApiUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();
        if (stockData.balance && Array.isArray(stockData.balance)) {
          // Filtrar apenas warehouse com nome "13"
          const filteredBalance = stockData.balance.filter((balance: VTEXStockBalance) => 
            balance.warehouseName === "13"
          );
          
          return {
            skuId: skuId.toString(),
            balance: filteredBalance
          };
        }
      }
      return null;
    } catch (error) {
      console.warn(`⚠️ Erro ao buscar stock do SKU ${skuId}:`, error);
      return null;
    }
  }

  /**
   * Importar produto completo (produto + marca + categoria + SKUs + imagens)
   */
  async importCompleteProduct(productId: number): Promise<{
    product: VTEXProduct;
    brand: VTEXBrand;
    category: VTEXCategory;
    skus: VTEXSKU[];
    images: VTEXImage[];
    stock: any[];
  }> {
    console.log(`🔄 Iniciando importação completa do produto ${productId}...`);

    try {
      // 1. Buscar produto
      console.log(`📦 Buscando produto ${productId}...`);
      const product = await this.getProduct(productId);

      // 2. Buscar marca
      console.log(`🏷️ Buscando marca ${product.BrandId}...`);
      const brand = await this.getBrand(product.BrandId);

      // 3. Buscar categoria
      console.log(`📂 Buscando categoria ${product.CategoryId}...`);
      const category = await this.getCategory(product.CategoryId);

      // 4. Buscar SKUs
      console.log(`📋 Buscando SKUs do produto ${productId}...`);
      const skus = await this.getProductSKUs(productId);

      // 5. Buscar imagens apenas do primeiro SKU que tiver imagens
      console.log(`🖼️ Buscando imagens dos SKUs...`);
      const allImages: VTEXImage[] = [];
      let imagesFound = false;
      
      for (const sku of skus) {
        if (!imagesFound) {
          try {
            const skuImages = await this.getSKUImages(sku.Id);
            if (skuImages.length > 0) {
              console.log(`✅ Imagens encontradas no SKU ${sku.Id}! Parando busca.`);
              allImages.push(...skuImages);
              imagesFound = true;
              break; // Parar assim que encontrar imagens
            } else {
              console.log(`❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
            }
          } catch (error) {
            console.warn(`⚠️ Erro ao buscar imagens do SKU ${sku.Id}:`, error);
          }
        } else {
          console.log(`⏭️ SKU ${sku.Id} pulado - imagens já encontradas`);
        }
      }

      // 6. Buscar stock de todos os SKUs
      console.log(`📦 Buscando stock dos SKUs...`);
      const allStock: any[] = [];
      
      for (const sku of skus) {
        try {
          const skuStock = await this.getSKUStock(sku.Id);
          if (skuStock && skuStock.balance) {
            allStock.push(...skuStock.balance);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar stock do SKU ${sku.Id}:`, error);
        }
      }

      console.log(`✅ Importação completa do produto ${productId} finalizada!`);
      console.log(`📊 Resumo: 1 produto, 1 marca, 1 categoria, ${skus.length} SKUs, ${allImages.length} imagens, ${allStock.length} registros de stock`);

      return {
        product,
        brand,
        category,
        skus,
        images: allImages,
        stock: allStock,
      };
    } catch (error) {
      console.error(`❌ Erro na importação do produto ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Importar produto completo por RefId (produto + marca + categoria + SKUs + imagens)
   */
  async importCompleteProductByRefId(refId: string): Promise<{
    product: VTEXProduct;
    brand: VTEXBrand;
    category: VTEXCategory;
    skus: VTEXSKU[];
    images: VTEXImage[];
    stock: any[];
  }> {
    console.log(`🔄 Iniciando importação completa do produto RefId ${refId}...`);

    try {
      // 1. Buscar produto por RefId
      console.log(`📦 Buscando produto RefId ${refId}...`);
      const product = await this.getProductByRefId(refId);

      // 2. Buscar marca
      console.log(`🏷️ Buscando marca ${product.BrandId}...`);
      const brand = await this.getBrand(product.BrandId);

      // 3. Buscar categoria
      console.log(`📂 Buscando categoria ${product.CategoryId}...`);
      const category = await this.getCategory(product.CategoryId);

      // 4. Buscar SKUs
      console.log(`📋 Buscando SKUs do produto ${product.Id}...`);
      const skus = await this.getProductSKUs(product.Id);

      // 5. Buscar imagens dos SKUs até encontrar
      console.log(`🖼️ Buscando imagens em ${skus.length} SKUs...`);
      const allImages: VTEXImage[] = [];
      let imagesFound = false;
      
      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i];
        console.log(`🔍 Verificando SKU ${i + 1}/${skus.length}: ${sku.Id} (${sku.Name || 'N/A'})`);
        
        try {
          const skuImages = await this.getSKUImages(sku.Id);
          console.log(`📊 SKU ${sku.Id}: ${skuImages.length} imagens encontradas`);
          
          if (skuImages.length > 0) {
            console.log(`✅ Imagens encontradas no SKU ${sku.Id}! Parando busca.`);
            allImages.push(...skuImages);
            imagesFound = true;
            break; // Parar assim que encontrar imagens
          } else {
            console.log(`❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar imagens do SKU ${sku.Id}:`, error);
          // Continuar para o próximo SKU em caso de erro
        }
      }
      
      if (!imagesFound) {
        console.log(`❌ Nenhuma imagem encontrada em nenhum dos ${skus.length} SKUs`);
      }

      // 6. Buscar dados de estoque de todos os SKUs
      console.log(`📦 6. Buscando dados de estoque de ${skus.length} SKUs...`);
      const allStockData: any[] = [];
      let stockSuccessCount = 0;
      let stockErrorCount = 0;
      
      for (const sku of skus) {
        console.log(`🔍 Buscando estoque do SKU ${sku.Id}...`);
        
        try {
          const stockApiUrl = `https://${this.config.accountName}.${this.config.environment}.com.br/api/logistics/pvt/inventory/skus/${sku.Id}`;
          
          const stockResponse = await fetch(stockApiUrl, {
            method: 'GET',
            headers: {
              'X-VTEX-API-AppKey': this.config.appKey,
              'X-VTEX-API-AppToken': this.config.appToken,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (stockResponse.ok) {
            const stockData = await stockResponse.json();
            console.log(`📊 SKU ${sku.Id}: ${stockData.balance?.length || 0} warehouses encontrados`);
            
            if (stockData.balance && Array.isArray(stockData.balance)) {
              allStockData.push({
                skuId: sku.Id,
                skuName: sku.Name || 'N/A',
                balance: stockData.balance
              });
              stockSuccessCount++;
            }
          } else {
            console.log(`⚠️ Erro na API de estoque para SKU ${sku.Id}: ${stockResponse.status}`);
            stockErrorCount++;
          }
        } catch (error) {
          console.error(`❌ Erro ao buscar estoque do SKU ${sku.Id}:`, error);
          stockErrorCount++;
        }
      }
      
      console.log(`📊 Resumo do estoque: ${stockSuccessCount} SKUs processados, ${stockErrorCount} erros`);

      console.log(`✅ Importação completa do produto RefId ${refId} finalizada!`);
      console.log(`📊 Resumo: 1 produto, 1 marca, 1 categoria, ${skus.length} SKUs, ${allImages.length} imagens, estoque de ${stockSuccessCount} SKUs`);

      return {
        product,
        brand,
        category,
        skus,
        images: allImages,
        stock: allStockData,
      };
    } catch (error) {
      console.error(`❌ Erro na importação do produto RefId ${refId}:`, error);
      throw error;
    }
  }
}

// Função para buscar configurações VTEX do banco de dados
async function getVtexConfigFromDB(): Promise<VTEXConfig> {
  const { executeQuery } = await import('./db-ultra-simple');
  
  try {
    const [configs] = await executeQuery(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
    `);
    
    const configMap = (configs as any[]).reduce((acc: any, config: any) => {
      acc[config.config_key] = config.config_value;
      return acc;
    }, {});
    
    return {
      accountName: configMap.vtex_account_name || 'projetoinfluencer',
      environment: configMap.vtex_environment || 'vtexcommercestable',
      appKey: configMap.vtex_app_key || '',
      appToken: configMap.vtex_app_token || '',
    };
  } catch (error) {
    console.error('Erro ao buscar configurações VTEX do banco:', error);
    // Fallback para configurações padrão
    return {
      accountName: 'projetoinfluencer',
      environment: 'vtexcommercestable',
      appKey: 'vtexappkey-urbane-ONYTAV',
      appToken: 'TOWYDCVLZSPSXSDEHFCKYDKATTPJQMVZPMRKLBJNICVVEMSWDDOQBIRPGIOBNNEMJOKNRCWZODANPIRQGCNWKGVWLZBHMHOIPHZPAMEQCGMBRILAUDXRFHVXQTRDBGTC',
    };
  }
}

// Configuração padrão da VTEX (fallback)
export const vtexConfig: VTEXConfig = {
  accountName: 'projetoinfluencer',
  environment: 'vtexcommercestable',
  appKey: 'vtexappkey-urbane-ONYTAV',
  appToken: 'TOWYDCVLZSPSXSDEHFCKYDKATTPJQMVZPMRKLBJNICVVEMSWDDOQBIRPGIOBNNEMJOKNRCWZODANPIRQGCNWKGVWLZBHMHOIPHZPAMEQCGMBRILAUDXRFHVXQTRDBGTC',
};

// Instância padrão do serviço
export const vtexService = new VTEXService(vtexConfig);

// Função para criar uma instância do serviço com configurações do banco
export async function createVtexServiceFromDB(): Promise<VTEXService> {
  const config = await getVtexConfigFromDB();
  return new VTEXService(config);
}

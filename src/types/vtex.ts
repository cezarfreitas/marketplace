// Tipos para produtos VTEX
export interface VtexProduct {
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
  ProductSpecifications: VtexProductSpecification[];
  ProductCategories: VtexProductCategory[];
  ProductBrand: VtexBrand;
}

export interface VtexProductSpecification {
  FieldId: number;
  FieldName: string;
  FieldValueIds: number[];
  IsFilter: boolean;
  FieldGroupId: number;
  FieldGroupName: string;
}

export interface VtexProductCategory {
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
  Score: number;
  LinkId: string;
  HasChildren: boolean;
}

export interface VtexBrand {
  Id: number;
  Name: string;
  Text: string;
  Keywords: string;
  SiteTitle: string;
  Active: boolean;
  MenuHome: boolean;
  AdWordsRemarketingCode: string;
  LomadeeCampaignCode: string;
  Score: number;
  LinkId: string;
}

export interface VtexAlternateId {
  Ean: string;
  RefId: string;
}

export interface VtexKitItem {
  ItemId: number;
  Amount: number;
}

export interface VtexVideo {
  VideoUrl: string;
  VideoTitle: string;
}

export interface VtexImage {
  ImageUrl: string;
  ImageName: string;
  FileId: number;
}

export interface VtexSkuSpecification {
  FieldId: number;
  FieldName: string;
  FieldValueIds: number[];
  IsFilter: boolean;
  FieldGroupId: number;
  FieldGroupName: string;
}

export interface VtexProductSpecificationGroup {
  Name: string;
  Specifications: VtexProductSpecification[];
}

// Tipos para SKUs VTEX
export interface VtexSku {
  Id: number;
  ProductId: number;
  NameComplete: string;
  ComplementName: string;
  ProductName: string;
  ProductDescription: string;
  ProductRefId: string;
  TaxCode: string;
  SkuName: string;
  IsActive: boolean;
  IsTransported: boolean;
  IsInventoried: boolean;
  IsGiftCardRecharge: boolean;
  ImageUrl: string;
  DetailUrl: string;
  CSCIdentification: string;
  BrandId: string;
  BrandName: string;
  Dimension: VtexDimension;
  RealDimension: VtexDimension;
  ManufacturerCode: string;
  IsKit: boolean;
  KitItems: VtexKitItem[];
  Services: VtexService[];
  Categories: string[];
  CategoriesFullPath: string[];
  Attachments: VtexAttachment[];
  Collections: string[];
  SkuSellers: VtexSkuSeller[];
  SalesChannels: number[];
  Images: VtexImage[];
  Videos: VtexVideo[];
  SkuSpecifications: VtexSkuSpecification[];
  ProductSpecifications: VtexProductSpecification[];
  AlternateIds: VtexAlternateId;
  AlternateIdValues: string;
  EstimatedDateArrival: string;
  MeasurementUnit: string;
  UnitMultiplier: number;
  InformationSource: string;
  ModalType: string;
}

export interface VtexDimension {
  cubicweight: number;
  height: number;
  length: number;
  weight: number;
  width: number;
}

export interface VtexService {
  Id: number;
  Name: string;
  Type: string;
  Logo: string;
  Description: string;
  Keywords: string;
  ServiceTypeId: number;
  Link: string;
  Available: boolean;
  Taxable: boolean;
  Restricted: boolean;
  IsGiftCard: boolean;
  IsRequired: boolean;
  IsDefault: boolean;
  IsOptional: boolean;
  IsVisible: boolean;
  IsActive: boolean;
  IsTransported: boolean;
  IsInventoried: boolean;
  IsGiftCardRecharge: boolean;
  ImageUrl: string;
  DetailUrl: string;
  CSCIdentification: string;
  BrandId: string;
  BrandName: string;
  Dimension: VtexDimension;
  RealDimension: VtexDimension;
  ManufacturerCode: string;
  IsKit: boolean;
  KitItems: VtexKitItem[];
  Services: VtexService[];
  Categories: string[];
  CategoriesFullPath: string[];
  Attachments: VtexAttachment[];
  Collections: string[];
  SkuSellers: VtexSkuSeller[];
  SalesChannels: number[];
  Images: VtexImage[];
  Videos: VtexVideo[];
  SkuSpecifications: VtexSkuSpecification[];
  ProductSpecifications: VtexProductSpecification[];
  AlternateIds: VtexAlternateId;
  AlternateIdValues: string;
  EstimatedDateArrival: string;
  MeasurementUnit: string;
  UnitMultiplier: number;
  InformationSource: string;
  ModalType: string;
}

export interface VtexAttachment {
  Id: number;
  Name: string;
  Required: boolean;
  DomainValues: string[];
}

export interface VtexSkuSeller {
  SellerId: string;
  SellerStockKeepingUnitId: string;
  StockKeepingUnitId: number;
  IsActive: boolean;
  FreightCommissionPercentage: number;
  ProductCommissionPercentage: number;
}

// Tipos para categorias VTEX
export interface VtexCategory {
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
  Score: number;
  LinkId: string;
  HasChildren: boolean;
}

// Tipos para marcas VTEX
export interface VtexBrand {
  Id: number;
  Name: string;
  Text: string;
  Keywords: string;
  SiteTitle: string;
  Active: boolean;
  MenuHome: boolean;
  AdWordsRemarketingCode: string;
  LomadeeCampaignCode: string;
  Score: number;
  LinkId: string;
}

// Tipos para resposta da API VTEX
export interface VtexApiResponse<T> {
  data: T;
  range: {
    total: number;
    from: number;
    to: number;
  };
}

// Tipos para configuração VTEX
export interface VtexConfig {
  accountName: string;
  environment: string;
  appKey: string;
  appToken: string;
}

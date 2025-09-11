import { executeQuery } from '../database';
import { ProductAttributesImportModule } from './product-attributes-import';

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
  CommercialConditionId?: number;
  RewardValue?: number;
  EstimatedDateArrival?: string;
  MeasurementUnit?: string;
  UnitMultiplier?: number;
  InformationSource?: string;
  ModalType?: string;
}

export interface ProductImportResult {
  success: boolean;
  message: string;
  data?: {
    productId: number;
    product: VTEXProduct;
  };
}

/**
 * Módulo de Importação de Produtos da VTEX
 * 
 * Este módulo é responsável por importar produtos da VTEX usando o RefId como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um RefId (Reference ID) do produto
 * 2. Busca o produto na API da VTEX usando o RefId
 * 3. Verifica se o produto já existe na tabela products_vtex
 * 4. Se existe: atualiza os dados
 * 5. Se não existe: insere um novo registro
 * 6. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é sempre feita pelo RefId, não pelo ID interno da VTEX
 */
export class ProductImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar produto por RefId
   * 
   * @param refId - Reference ID do produto na VTEX (ex: "TROMOLM0090L1")
   * @returns Promise<ProductImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new ProductImportModule(baseUrl, headers);
   * const result = await importer.importProductByRefId("TROMOLM0090L1");
   * 
   * if (result.success) {
   *   console.log(`Produto importado: ${result.data.product.Name}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importProductByRefId(refId: string): Promise<ProductImportResult> {
    try {
      console.log(`📦 PASSO 1: Importando produto por RefId: ${refId}`);

      // PASSO 1: Buscar produto na VTEX usando o RefId
      // Endpoint: /api/catalog_system/pvt/products/productgetbyrefid/{refId}
      console.log(`🔍 Buscando produto na VTEX com RefId: ${refId}`);
      const productResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/products/productgetbyrefid/${refId}`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!productResponse.ok) {
        if (productResponse.status === 404) {
          return {
            success: false,
            message: `❌ Produto com RefId "${refId}" não encontrado na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${productResponse.status})`
          };
        }
      }

      // Converter resposta para objeto Product
      const product: VTEXProduct = await productResponse.json();
      console.log(`✅ Produto encontrado na VTEX: ${product.Name} (ID VTEX: ${product.Id})`);

      // PASSO 2: Verificar se o produto já existe na nossa base de dados
      // Tabela: products_vtex
      // Campo de busca: id (que corresponde ao Id da VTEX)
      console.log(`🔍 Verificando se produto já existe na tabela products_vtex...`);
      const existingProduct = await executeQuery(`
        SELECT id FROM products_vtex WHERE id = ?
      `, [product.Id]);

      let productId: number;

      if (existingProduct && existingProduct.length > 0) {
        // PASSO 3A: Produto já existe - ATUALIZAR dados
        console.log(`📝 Produto já existe, atualizando dados...`);
        productId = existingProduct[0].id;
        
        await executeQuery(`
          UPDATE products_vtex SET
            name = ?,                    -- Nome do produto
            department_id = ?,           -- ID do departamento
            category_id = ?,             -- ID da categoria
            brand_id = ?,                -- ID da marca
            link_id = ?,                 -- Link ID
            ref_id = ?,                  -- Reference ID
            is_visible = ?,              -- Se está visível
            description = ?,             -- Descrição completa
            description_short = ?,       -- Descrição curta
            release_date = ?,            -- Data de lançamento
            keywords = ?,                -- Palavras-chave
            title = ?,                   -- Título do produto
            is_active = ?,               -- Se está ativo
            tax_code = ?,                -- Código de imposto
            meta_tag_description = ?,    -- Meta descrição para SEO
            supplier_id = ?,             -- ID do fornecedor
            show_without_stock = ?,      -- Mostrar sem estoque
            adwords_remarketing_code = ?, -- Código AdWords
            lomadee_campaign_code = ?,   -- Código Lomadee
            updated_at = NOW()           -- Data de atualização
          WHERE id = ?
        `, [
          product.Name,
          product.DepartmentId,
          product.CategoryId,
          product.BrandId,
          product.LinkId,
          product.RefId,
          product.IsVisible,
          product.Description,
          product.DescriptionShort,
          product.ReleaseDate,
          product.KeyWords,
          product.Title,
          product.IsActive,
          product.TaxCode,
          product.MetaTagDescription,
          product.SupplierId,
          product.ShowWithoutStock,
          product.AdWordsRemarketingCode,
          product.LomadeeCampaignCode,
          product.Id
        ]);
        console.log(`✅ Produto atualizado com sucesso: ${product.Name}`);
      } else {
        // PASSO 3B: Produto não existe - INSERIR novo registro
        console.log(`📝 Produto não existe, inserindo novo registro...`);
        
        const insertResult = await executeQuery(`
          INSERT INTO products_vtex (
            id,                          -- ID da VTEX
            name,                        -- Nome do produto
            department_id,               -- ID do departamento
            category_id,                 -- ID da categoria
            brand_id,                    -- ID da marca
            link_id,                     -- Link ID
            ref_id,                      -- Reference ID
            is_visible,                  -- Se está visível
            description,                 -- Descrição completa
            description_short,           -- Descrição curta
            release_date,                -- Data de lançamento
            keywords,                    -- Palavras-chave
            title,                       -- Título do produto
            is_active,                   -- Se está ativo
            tax_code,                    -- Código de imposto
            meta_tag_description,        -- Meta descrição para SEO
            supplier_id,                 -- ID do fornecedor
            show_without_stock,          -- Mostrar sem estoque
            adwords_remarketing_code,    -- Código AdWords
            lomadee_campaign_code        -- Código Lomadee
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.Id,                    // ID da VTEX
          product.Name,                  // Nome
          product.DepartmentId,          // ID do departamento
          product.CategoryId,            // ID da categoria
          product.BrandId,               // ID da marca
          product.LinkId,                // Link ID
          product.RefId,                 // Reference ID
          product.IsVisible,             // Visível
          product.Description,           // Descrição
          product.DescriptionShort,      // Descrição curta
          product.ReleaseDate,           // Data de lançamento
          product.KeyWords,              // Palavras-chave
          product.Title,                 // Título
          product.IsActive,              // Ativo
          product.TaxCode,               // Código de imposto
          product.MetaTagDescription,    // Meta descrição
          product.SupplierId,            // ID do fornecedor
          product.ShowWithoutStock,      // Mostrar sem estoque
          product.AdWordsRemarketingCode, // Código AdWords
          product.LomadeeCampaignCode    // Código Lomadee
        ]);
        productId = insertResult.insertId!;
        console.log(`✅ Produto inserido com sucesso: ${product.Name} (ID: ${productId})`);
      }

      // PASSO 4: Retornar resultado da importação
      return {
        success: true,
        message: `✅ Produto "${product.Name}" importado com sucesso`,
        data: {
          productId,
          product
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar produto ${refId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar produto: ${error.message}`
      };
    }
  }

  /**
   * Verificar se produto existe por RefId
   */
  async checkProductExists(refId: string): Promise<boolean> {
    try {
      const productResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/products/productgetbyrefid/${refId}`, {
        method: 'GET',
        headers: this.headers
      });

      return productResponse.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Buscar produto por RefId (sem salvar)
   */
  async getProductByRefId(refId: string): Promise<VTEXProduct | null> {
    try {
      const productResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/products/productgetbyrefid/${refId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!productResponse.ok) {
        return null;
      }

      return await productResponse.json();
    } catch (error) {
      return null;
    }
  }
}

import { executeQuery } from '../database';

/**
 * Interface para dados da marca da VTEX
 */
export interface VTEXBrand {
  id: number;
  name: string;
  isActive: boolean;
  metaTagDescription: string;
  imageUrl: string | null;
  title: string;
}

/**
 * Resultado da importação de marca
 */
export interface BrandImportResult {
  success: boolean;
  message: string;
  data?: {
    brandId: number;
    brand: VTEXBrand;
  };
}

/**
 * Módulo de Importação de Marcas da VTEX
 * 
 * Este módulo é responsável por importar marcas da VTEX usando o brand_id como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um brand_id da VTEX
 * 2. Busca a marca na API da VTEX usando o brand_id
 * 3. Verifica se a marca já existe na tabela brands_vtex
 * 4. Se existe: atualiza os dados
 * 5. Se não existe: insere um novo registro
 * 6. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é sempre feita pelo brand_id da VTEX
 */
export class BrandImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar marca por brand_id
   * 
   * @param brandId - ID da marca na VTEX (ex: 156165151)
   * @returns Promise<BrandImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new BrandImportModule(baseUrl, headers);
   * const result = await importer.importBrandById(156165151);
   * 
   * if (result.success) {
   *   console.log(`Marca importada: ${result.data.brand.name}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importBrandById(brandId: number): Promise<BrandImportResult> {
    try {
      console.log(`🏷️ PASSO 1: Importando marca por brand_id: ${brandId}`);

      // PASSO 1: Buscar marca na VTEX usando o brand_id
      // Endpoint: /api/catalog_system/pvt/brand/{brandId}
      console.log(`🔍 Buscando marca na VTEX com brand_id: ${brandId}`);
      const brandResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/brand/${brandId}`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!brandResponse.ok) {
        if (brandResponse.status === 404) {
          return {
            success: false,
            message: `❌ Marca com brand_id "${brandId}" não encontrada na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${brandResponse.status})`
          };
        }
      }

      // Converter resposta para objeto Brand
      const brand: VTEXBrand = await brandResponse.json();
      console.log(`✅ Marca encontrada na VTEX: ${brand.name} (ID VTEX: ${brand.id})`);

      // PASSO 2: Verificar se a marca já existe na nossa base de dados
      // Tabela: brands_vtex
      // Campo de busca: id_brand_vtex (que corresponde ao id da VTEX)
      console.log(`🔍 Verificando se marca já existe na tabela brands_vtex...`);
      const existingBrand = await executeQuery(`
        SELECT id_brand_vtex FROM brands_vtex WHERE id_brand_vtex = ?
      `, [brand.id]);

      let brandDbId: number;

      if (existingBrand && existingBrand.length > 0) {
        // PASSO 3A: Marca já existe - ATUALIZAR dados
        console.log(`📝 Marca já existe, atualizando dados...`);
        brandDbId = existingBrand[0].id_brand_vtex;
        
        await executeQuery(`
          UPDATE brands_vtex SET
            name = ?,                    -- Nome da marca
            is_active = ?,               -- Se está ativa
            title = ?,                   -- Título da marca
            meta_tag_description = ?,    -- Meta descrição para SEO
            image_url = ?,               -- URL da imagem
            contexto = NULL,             -- Campo contexto (não disponível na API VTEX)
            updated_at = NOW()           -- Data de atualização
          WHERE id_brand_vtex = ?
        `, [
          brand.name,
          brand.isActive,
          brand.title,
          brand.metaTagDescription,
          brand.imageUrl,
          brand.id
        ]);
        console.log(`✅ Marca atualizada com sucesso: ${brand.name}`);
      } else {
        // PASSO 3B: Marca não existe - INSERIR novo registro
        console.log(`📝 Marca não existe, inserindo novo registro...`);
        
        const insertResult = await executeQuery(`
          INSERT INTO brands_vtex (
            id_brand_vtex,               -- ID da VTEX (único)
            name,                        -- Nome da marca
            is_active,                   -- Se está ativa
            title,                       -- Título da marca
            meta_tag_description,        -- Meta descrição para SEO
            image_url,                   -- URL da imagem
            contexto,                    -- Campo contexto (não disponível na API VTEX)
            created_at,                  -- Data de criação
            updated_at                   -- Data de atualização
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          brand.id,                      // ID da VTEX
          brand.name,                    // Nome
          brand.isActive,                // Ativa
          brand.title,                   // Título
          brand.metaTagDescription,      // Meta descrição
          brand.imageUrl,                // URL da imagem
          null                           // Contexto (não disponível na API VTEX)
        ]);
        brandDbId = (insertResult as any).insertId!;
        console.log(`✅ Marca inserida com sucesso: ${brand.name} (ID: ${brandDbId})`);
      }

      // PASSO 4: Retornar resultado da importação
      return {
        success: true,
        message: `✅ Marca "${brand.name}" importada com sucesso`,
        data: {
          brandId: brandDbId,
          brand
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar marca ${brandId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar marca: ${error.message}`
      };
    }
  }

  /**
   * Verificar se marca existe por brand_id
   */
  async checkBrandExists(brandId: number): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT id_brand_vtex FROM brands_vtex WHERE id_brand_vtex = ?
      `, [brandId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar marca:', error);
      return false;
    }
  }

  /**
   * Buscar marca por brand_id
   */
  async getBrandById(brandId: number): Promise<VTEXBrand | null> {
    try {
      const result = await executeQuery(`
        SELECT id_brand_vtex, name, is_active, title, meta_tag_description, image_url
        FROM brands_vtex WHERE id_brand_vtex = ?
      `, [brandId]);
      
      if (result && result.length > 0) {
        const brand = result[0];
        return {
          id: brand.id_brand_vtex,
          name: brand.name,
          isActive: brand.is_active,
          title: brand.title,
          metaTagDescription: brand.meta_tag_description,
          imageUrl: brand.image_url
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar marca:', error);
      return null;
    }
  }
}

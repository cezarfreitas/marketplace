import { executeQuery } from '../database';

/**
 * Interface para dados da categoria da VTEX
 * Baseada na estrutura real da API VTEX
 */
export interface VTEXCategory {
  Id: number;
  Name: string;
  FatherCategoryId?: number;
  Title: string;
  Description?: string;
  Keywords?: string;
  IsActive: boolean;
  LomadeeCampaignCode?: string;
  AdWordsRemarketingCode?: string;
  ShowInStoreFront: boolean;
  ShowBrandFilter: boolean;
  ActiveStoreFrontLink: boolean;
  GlobalCategoryId?: number;
  StockKeepingUnitSelectionMode?: string;
  Score?: number;
  LinkId?: string;
  HasChildren: boolean;
}

/**
 * Resultado da importação de categoria
 */
export interface CategoryImportResult {
  success: boolean;
  message: string;
  data?: {
    categoryId: number;
    category: VTEXCategory;
  };
}

/**
 * Módulo de Importação de Categorias da VTEX
 * 
 * Este módulo é responsável por importar categorias da VTEX usando o category_id como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um category_id da VTEX
 * 2. Busca a categoria na API da VTEX usando o category_id
 * 3. Verifica se a categoria já existe na tabela categories_vtex
 * 4. Se existe: atualiza os dados
 * 5. Se não existe: insere um novo registro
 * 6. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é sempre feita pelo category_id da VTEX
 */
export class CategoryImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar categoria por category_id
   * 
   * @param categoryId - ID da categoria na VTEX (ex: 156165151)
   * @returns Promise<CategoryImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new CategoryImportModule(baseUrl, headers);
   * const result = await importer.importCategoryById(156165151);
   * 
   * if (result.success) {
   *   console.log(`Categoria importada: ${result.data.category.name}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importCategoryById(categoryId: number): Promise<CategoryImportResult> {
    try {
      console.log(`📂 PASSO 1: Importando categoria por category_id: ${categoryId}`);

      // PASSO 1: Buscar categoria na VTEX usando o category_id
      // Endpoint: /api/catalog/pvt/category/{categoryId}
      console.log(`🔍 Buscando categoria na VTEX com category_id: ${categoryId}`);
      const categoryResponse = await fetch(`${this.baseUrl}/api/catalog/pvt/category/${categoryId}`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!categoryResponse.ok) {
        if (categoryResponse.status === 404) {
          return {
            success: false,
            message: `❌ Categoria com category_id "${categoryId}" não encontrada na VTEX`
          };
        } else if (categoryResponse.status === 500) {
          return {
            success: false,
            message: `❌ Erro interno da API VTEX (Status: 500) - Categoria ${categoryId} pode não existir ou estar inativa`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${categoryResponse.status})`
          };
        }
      }

      // Converter resposta para objeto Category
      const category: VTEXCategory = await categoryResponse.json();
      console.log(`✅ Categoria encontrada na VTEX: ${category.Name} (ID VTEX: ${category.Id})`);

      // PASSO 2: Verificar se a categoria já existe na nossa base de dados
      // Tabela: categories_vtex
      // Campo de busca: vtex_id (que corresponde ao Id da VTEX)
      console.log(`🔍 Verificando se categoria já existe na tabela categories_vtex...`);
      const existingCategory = await executeQuery(`
        SELECT vtex_id FROM categories_vtex WHERE vtex_id = ?
      `, [category.Id]);

      let categoryDbId: number;

      if (existingCategory && existingCategory.length > 0) {
        // PASSO 3A: Categoria já existe - ATUALIZAR dados
        console.log(`📝 Categoria já existe, atualizando dados...`);
        categoryDbId = existingCategory[0].vtex_id;
        
        await executeQuery(`
          UPDATE categories_vtex SET
            name = ?,                    -- Nome da categoria
            father_category_id = ?,      -- ID da categoria pai
            title = ?,                   -- Título da categoria
            description = ?,             -- Descrição da categoria
            keywords = ?,                -- Palavras-chave
            is_active = ?,               -- Se está ativa
            lomadee_campaign_code = ?,   -- Código da campanha Lomadee
            adwords_remarketing_code = ?, -- Código do remarketing AdWords
            show_in_store_front = ?,     -- Mostrar na vitrine
            show_brand_filter = ?,       -- Mostrar filtro de marca
            active_store_front_link = ?, -- Link ativo na vitrine
            global_category_id = ?,      -- ID da categoria global
            stock_keeping_unit_selection_mode = ?, -- Modo de seleção de SKU
            score = ?,                   -- Pontuação
            link_id = ?,                 -- Link ID
            has_children = ?,            -- Tem filhos
            updated_at = NOW()           -- Data de atualização
          WHERE vtex_id = ?
        `, [
          category.Name,
          category.FatherCategoryId,
          category.Title,
          category.Description,
          category.Keywords,
          category.IsActive,
          category.LomadeeCampaignCode,
          category.AdWordsRemarketingCode,
          category.ShowInStoreFront,
          category.ShowBrandFilter,
          category.ActiveStoreFrontLink,
          category.GlobalCategoryId,
          category.StockKeepingUnitSelectionMode,
          category.Score,
          category.LinkId,
          category.HasChildren,
          category.Id
        ]);
        console.log(`✅ Categoria atualizada com sucesso: ${category.Name}`);
      } else {
        // PASSO 3B: Categoria não existe - INSERIR novo registro
        console.log(`📝 Categoria não existe, inserindo novo registro...`);
        
        const insertResult = await executeQuery(`
          INSERT INTO categories_vtex (
            vtex_id,                     -- ID da VTEX (único)
            name,                        -- Nome da categoria
            father_category_id,          -- ID da categoria pai
            title,                       -- Título da categoria
            description,                 -- Descrição da categoria
            keywords,                    -- Palavras-chave
            is_active,                   -- Se está ativa
            lomadee_campaign_code,       -- Código da campanha Lomadee
            adwords_remarketing_code,    -- Código do remarketing AdWords
            show_in_store_front,         -- Mostrar na vitrine
            show_brand_filter,           -- Mostrar filtro de marca
            active_store_front_link,     -- Link ativo na vitrine
            global_category_id,          -- ID da categoria global
            stock_keeping_unit_selection_mode, -- Modo de seleção de SKU
            score,                       -- Pontuação
            link_id,                     -- Link ID
            has_children,                -- Tem filhos
            created_at,                  -- Data de criação
            updated_at                   -- Data de atualização
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          category.Id,                   // ID da VTEX
          category.Name,                 // Nome
          category.FatherCategoryId,     // ID da categoria pai
          category.Title,                // Título
          category.Description,          // Descrição
          category.Keywords,             // Palavras-chave
          category.IsActive,             // Ativa
          category.LomadeeCampaignCode,  // Código da campanha Lomadee
          category.AdWordsRemarketingCode, // Código do remarketing AdWords
          category.ShowInStoreFront,     // Mostrar na vitrine
          category.ShowBrandFilter,      // Mostrar filtro de marca
          category.ActiveStoreFrontLink, // Link ativo na vitrine
          category.GlobalCategoryId,     // ID da categoria global
          category.StockKeepingUnitSelectionMode, // Modo de seleção de SKU
          category.Score,                // Pontuação
          category.LinkId,               // Link ID
          category.HasChildren,          // Tem filhos
        ]);
        categoryDbId = (insertResult as any).insertId!;
        console.log(`✅ Categoria inserida com sucesso: ${category.Name} (ID: ${categoryDbId})`);
      }

      // PASSO 4: Retornar resultado da importação
      return {
        success: true,
        message: `✅ Categoria "${category.Name}" importada com sucesso`,
        data: {
          categoryId: categoryDbId,
          category
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar categoria ${categoryId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar categoria: ${error.message}`
      };
    }
  }

  /**
   * Verificar se categoria existe por category_id
   */
  async checkCategoryExists(categoryId: number): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT vtex_id FROM categories_vtex WHERE vtex_id = ?
      `, [categoryId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar categoria:', error);
      return false;
    }
  }

  /**
   * Buscar categoria por category_id
   */
  async getCategoryById(categoryId: number): Promise<VTEXCategory | null> {
    try {
      const result = await executeQuery(`
        SELECT vtex_id, name, father_category_id, title, description, keywords, 
               is_active, show_in_store_front, show_brand_filter, active_store_front_link,
               global_category_id, stock_keeping_unit_selection_mode, score, link_id,
               has_children
        FROM categories_vtex WHERE vtex_id = ?
      `, [categoryId]);
      
      if (result && result.length > 0) {
        const category = result[0];
        return {
          Id: category.vtex_id,
          Name: category.name,
          FatherCategoryId: category.father_category_id,
          Title: category.title,
          Description: category.description,
          Keywords: category.keywords,
          IsActive: category.is_active,
          LomadeeCampaignCode: category.lomadee_campaign_code,
          AdWordsRemarketingCode: category.adwords_remarketing_code,
          ShowInStoreFront: category.show_in_store_front,
          ShowBrandFilter: category.show_brand_filter,
          ActiveStoreFrontLink: category.active_store_front_link,
          GlobalCategoryId: category.global_category_id,
          StockKeepingUnitSelectionMode: category.stock_keeping_unit_selection_mode,
          Score: category.score,
          LinkId: category.link_id,
          HasChildren: category.has_children
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      return null;
    }
  }
}

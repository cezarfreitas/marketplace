import { executeQuery } from '../database';

/**
 * Interface para dados da imagem da VTEX
 */
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

/**
 * Resultado da importação de imagens
 */
export interface ImageImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    updatedCount: number;
    images: VTEXImage[];
  };
}

/**
 * Módulo de Importação de Imagens da VTEX
 * 
 * Este módulo é responsável por importar imagens da VTEX usando o ID do SKU como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um ID do SKU (da tabela skus_vtex)
 * 2. Busca as imagens na API da VTEX usando o ID do SKU
 * 3. Para cada imagem encontrada:
 *    - Verifica se já existe na tabela images_vtex
 *    - Se existe: atualiza os dados
 *    - Se não existe: insere um novo registro
 * 4. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é feita pelo ID do SKU (da tabela skus_vtex)
 */
export class ImageImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar imagens por ID do SKU
   * 
   * @param skuId - ID do SKU na VTEX (ex: 310118490)
   * @returns Promise<ImageImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new ImageImportModule(baseUrl, headers);
   * const result = await importer.importImagesBySkuId(310118490);
   * 
   * if (result.success) {
   *   console.log(`Imagens importadas: ${result.data.importedCount}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importImagesBySkuId(skuId: number): Promise<ImageImportResult> {
    try {
      console.log(`🖼️ PASSO 1: Importando imagens por sku_id: ${skuId}`);

      // PASSO 1: Buscar imagens na VTEX usando o ID do SKU
      // Endpoint: /api/catalog/pvt/stockkeepingunit/{skuId}/file
      console.log(`🔍 Buscando imagens na VTEX com sku_id: ${skuId}`);
      const imagesResponse = await fetch(`${this.baseUrl}/api/catalog/pvt/stockkeepingunit/${skuId}/file`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!imagesResponse.ok) {
        if (imagesResponse.status === 404) {
          return {
            success: false,
            message: `❌ Imagens para SKU com ID "${skuId}" não encontradas na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${imagesResponse.status})`
          };
        }
      }

      // Converter resposta para array de imagens
      const images: VTEXImage[] = await imagesResponse.json();
      console.log(`✅ ${images.length} imagens encontradas na VTEX para o SKU ${skuId}`);

      if (images.length === 0) {
        return {
          success: true,
          message: `✅ Nenhuma imagem encontrada para o SKU ${skuId}`,
          data: {
            importedCount: 0,
            updatedCount: 0,
            images: []
          }
        };
      }

      let importedCount = 0;
      let updatedCount = 0;

      // PASSO 2: Processar cada imagem encontrada
      for (let i = 0; i < images.length; i++) {
        const vtexImage = images[i];
        console.log(`🔍 Processando imagem ${i + 1}/${images.length}: ${vtexImage.Id} (${vtexImage.Name})`);

        // PASSO 2A: Verificar se a imagem já existe na nossa base de dados
        // Tabela: images_vtex
        // Campo de busca: id (que corresponde ao Id da VTEX)
        const existingImage = await executeQuery(`
          SELECT id FROM images_vtex WHERE id = ?
        `, [vtexImage.Id]);

        if (existingImage && existingImage.length > 0) {
          // PASSO 2B: Imagem já existe - ATUALIZAR dados
          console.log(`📝 Imagem já existe, atualizando dados...`);
          
          await executeQuery(`
            UPDATE images_vtex SET
              archive_id = ?,               -- ID do arquivo
              sku_id = ?,                   -- ID do SKU
              name = ?,                     -- Nome da imagem
              is_main = ?,                  -- Se é imagem principal
              text = ?,                     -- Texto da imagem
              label = ?,                    -- Label da imagem
              url = ?,                      -- URL da imagem
              file_location = ?,            -- Localização do arquivo
              position = ?,                 -- Posição da imagem
              updated_at = NOW()            -- Data de atualização
            WHERE id = ?
          `, [
            vtexImage.ArchiveId,
            vtexImage.SkuId,
            vtexImage.Name,
            vtexImage.IsMain,
            vtexImage.Text,
            vtexImage.Label,
            vtexImage.Url,
            vtexImage.FileLocation,
            vtexImage.Position,
            vtexImage.Id
          ]);
          
          updatedCount++;
          console.log(`✅ Imagem atualizada: ${vtexImage.Name}`);
        } else {
          // PASSO 2C: Imagem não existe - INSERIR novo registro
          console.log(`📝 Imagem não existe, inserindo novo registro...`);
          
          await executeQuery(`
            INSERT INTO images_vtex (
              id,                           -- ID da VTEX (único)
              archive_id,                   -- ID do arquivo
              sku_id,                       -- ID do SKU
              name,                         -- Nome da imagem
              is_main,                      -- Se é imagem principal
              text,                         -- Texto da imagem
              label,                        -- Label da imagem
              url,                          -- URL da imagem
              file_location,                -- Localização do arquivo
              position                      -- Posição da imagem
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            vtexImage.Id,                   // ID da VTEX
            vtexImage.ArchiveId,            // ID do arquivo
            vtexImage.SkuId,                // ID do SKU
            vtexImage.Name,                 // Nome
            vtexImage.IsMain,               // É principal
            vtexImage.Text,                 // Texto
            vtexImage.Label,                // Label
            vtexImage.Url,                  // URL
            vtexImage.FileLocation,         // Localização do arquivo
            vtexImage.Position              // Posição
          ]);
          
          importedCount++;
          console.log(`✅ Imagem inserida: ${vtexImage.Name} (ID: ${vtexImage.Id})`);
        }
      }

      // PASSO 3: Retornar resultado da importação
      return {
        success: true,
        message: `✅ ${importedCount} imagens importadas e ${updatedCount} imagens atualizadas com sucesso`,
        data: {
          importedCount,
          updatedCount,
          images
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar imagens para SKU ${skuId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar imagens: ${error.message}`
      };
    }
  }

  /**
   * Verificar se imagem existe por vtex_id
   */
  async checkImageExists(vtexId: number): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT id FROM images_vtex WHERE id = ?
      `, [vtexId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar imagem:', error);
      return false;
    }
  }

  /**
   * Buscar imagem por vtex_id
   */
  async getImageByVtexId(vtexId: number): Promise<VTEXImage | null> {
    try {
      const result = await executeQuery(`
        SELECT id, archive_id, sku_id, name, is_main, text, label, url, file_location, position
        FROM images_vtex WHERE id = ?
      `, [vtexId]);
      
      if (result && result.length > 0) {
        const image = result[0];
        return {
          Id: image.id,
          ArchiveId: image.archive_id,
          SkuId: image.sku_id,
          Name: image.name,
          IsMain: image.is_main,
          Label: image.label,
          Text: image.text,
          Url: image.url,
          FileLocation: image.file_location,
          Position: image.position
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar imagem:', error);
      return null;
    }
  }

  /**
   * Buscar todas as imagens de um SKU
   */
  async getImagesBySkuId(skuId: number): Promise<VTEXImage[]> {
    try {
      const result = await executeQuery(`
        SELECT id, archive_id, sku_id, name, is_main, text, label, url, file_location, position
        FROM images_vtex WHERE sku_id = ?
        ORDER BY position ASC
      `, [skuId]);
      
      return result.map((image: any) => ({
        Id: image.id,
        ArchiveId: image.archive_id,
        SkuId: image.sku_id,
        Name: image.name,
        IsMain: image.is_main,
        Label: image.label,
        Text: image.text,
        Url: image.url,
        FileLocation: image.file_location,
        Position: image.position
      }));
    } catch (error) {
      console.error('Erro ao buscar imagens do SKU:', error);
      return [];
    }
  }
}

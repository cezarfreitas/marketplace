import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery, executeModificationQuery } from '@/lib/database';

interface VTEXProduct {
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
  ListStoreId: number[];
  AdWordsRemarketingCode: string;
  LomadeeCampaignCode: string;
}

interface VTEXSKU {
  Id: number;
  ProductId: number;
  IsActive: boolean;
  Name: string;
  Height: number;
  RealHeight: number | null;
  Width: number;
  RealWidth: number | null;
  Length: number;
  RealLength: number | null;
  WeightKg: number;
  RealWeightKg: number | null;
  ModalId: number;
  RefId: string;
  CubicWeight: number;
  IsKit: boolean;
  IsDynamicKit: boolean | null;
  InternalNote: string | null;
  DateUpdated: string;
  RewardValue: number;
  CommercialConditionId: number;
  EstimatedDateArrival: string | null;
  FlagKitItensSellApart: boolean;
  ManufacturerCode: string;
  ReferenceStockKeepingUnitId: number | null;
  Position: number;
  EditionSkuId: number | null;
  ApprovedAdminId: number;
  EditionAdminId: number;
  ActivateIfPossible: boolean;
  SupplierCode: string | null;
  MeasurementUnit: string;
  UnitMultiplier: number;
  IsInventoried: boolean | null;
  IsTransported: boolean | null;
  IsGiftCardRecharge: boolean | null;
  ModalType: string | null;
}

interface VTEXSKUFile {
  Id: number;
  ArchiveId: number;
  SkuId: number;
  Name: string;
  IsMain: boolean;
  Label: string | null;
  Text: string;
  Url: string;
  FileLocation: string;
  Position: number;
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { skus } = await request.json();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de SKUs é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando importação de ${skus.length} SKUs`);

    // Usar configurações da VTEX das variáveis de ambiente
    const config = {
      vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
      vtex_environment: process.env.VTEX_ENVIRONMENT,
      vtex_app_key: process.env.VTEX_APP_KEY,
      vtex_app_token: process.env.VTEX_APP_TOKEN,
    };

    if (!config.vtex_account_name || !config.vtex_environment || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações da VTEX não encontradas nas variáveis de ambiente.'
      }, { status: 400 });
    }

    const baseUrl = `https://${config.vtex_account_name}.${config.vtex_environment}.com.br`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-VTEX-API-AppKey': config.vtex_app_key,
      'X-VTEX-API-AppToken': config.vtex_app_token,
    };

    const results = {
      total: skus.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ sku: string; message: string }>,
      imported: [] as Array<{ sku: string; product_name: string; product_id: number }>
    };

    // Processar cada SKU
    for (const sku of skus) {
      try {
        console.log(`🔍 Processando SKU: ${sku}`);

        // 1. Buscar produto por Reference ID
        const productResponse = await fetch(`${baseUrl}/api/catalog_system/pvt/products/productgetbyrefid/${sku}`, {
          method: 'GET',
          headers
        });

        if (!productResponse.ok) {
          if (productResponse.status === 404) {
            results.errors.push({ sku, message: 'Produto não encontrado na VTEX' });
          } else {
            results.errors.push({ sku, message: `Erro na API VTEX: ${productResponse.status}` });
          }
          results.failed++;
          continue;
        }

        const product: VTEXProduct = await productResponse.json();
        console.log(`📦 Produto encontrado: ${product.Name} (ID: ${product.Id})`);

        // 2. Buscar SKUs do produto
        const skusResponse = await fetch(`${baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${product.Id}`, {
          method: 'GET',
          headers
        });

        if (!skusResponse.ok) {
          results.errors.push({ sku, message: `Erro ao buscar SKUs: ${skusResponse.status}` });
          results.failed++;
          continue;
        }

        const productSkus: VTEXSKU[] = await skusResponse.json();
        console.log(`📋 ${productSkus.length} SKUs encontrados para o produto`);

        // PASSO 1: Importar/Atualizar Marca
        console.log(`🏷️ PASSO 1: Importando marca ${product.BrandId}...`);
        try {
          const brandResponse = await fetch(`${baseUrl}/api/catalog_system/pvt/brand/list`, {
            method: 'GET',
            headers
          });
          
          if (brandResponse.ok) {
            const brands = await brandResponse.json();
            const brand = brands.find((b: any) => b.id === product.BrandId);
            
            if (brand) {
              const existingBrand = await executeQuery(`
                SELECT id FROM brands_vtex WHERE id = ?
              `, [brand.id]);
              
              if (existingBrand && existingBrand.length > 0) {
                await executeQuery(`
                  UPDATE brands_vtex SET name = ?, is_active = ?, updated_at = NOW()
                  WHERE id = ?
                `, [brand.name, brand.isActive, brand.id]);
                console.log(`✅ Marca atualizada: ${brand.name}`);
              } else {
                await executeQuery(`
                  INSERT INTO brands_vtex (id, name, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, NOW(), NOW())
                `, [brand.id, brand.name, brand.isActive]);
                console.log(`✅ Marca inserida: ${brand.name}`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao importar marca:`, error);
        }

        // PASSO 2: Importar/Atualizar Categoria
        console.log(`📂 PASSO 2: Importando categoria ${product.CategoryId}...`);
        try {
          const categoryResponse = await fetch(`${baseUrl}/api/catalog_system/pvt/category/tree/2`, {
            method: 'GET',
            headers
          });
          
          if (categoryResponse.ok) {
            const categories = await categoryResponse.json();
            const findCategory = (cats: any[], id: number): any => {
              for (const cat of cats) {
                if (cat.id === id) return cat;
                if (cat.children) {
                  const found = findCategory(cat.children, id);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const category = findCategory(categories, product.CategoryId);
            
            if (category) {
              const existingCategory = await executeQuery(`
                SELECT vtex_id FROM categories_vtex WHERE vtex_id = ?
              `, [category.id]);
              
              if (existingCategory && existingCategory.length > 0) {
                await executeQuery(`
                  UPDATE categories_vtex SET name = ?, is_active = ?, updated_at = NOW()
                  WHERE vtex_id = ?
                `, [category.name, category.isActive, category.id]);
                console.log(`✅ Categoria atualizada: ${category.name}`);
              } else {
                await executeQuery(`
                  INSERT INTO categories_vtex (vtex_id, name, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, NOW(), NOW())
                `, [category.id, category.name, category.isActive]);
                console.log(`✅ Categoria inserida: ${category.name}`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao importar categoria:`, error);
        }

        // PASSO 3: Importar/Atualizar Produto
        console.log(`📦 PASSO 3: Importando produto ${product.Id}...`);
        const existingProduct = await executeQuery(`
          SELECT id FROM products_vtex WHERE id = ?
        `, [product.Id]);

        let productId: number;

        if (existingProduct && existingProduct.length > 0) {
          // Produto já existe, atualizar
          productId = existingProduct[0].id;
          await executeQuery(`
            UPDATE products_vtex SET
              name = ?,
              title = ?,
              description = ?,
              meta_tag_description = ?,
              is_active = ?,
              is_visible = ?,
              brand_id = ?,
              category_id = ?,
              department_id = ?,
              link_id = ?,
              keywords = ?,
              tax_code = ?,
              supplier_id = ?,
              show_without_stock = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE vtex_id = ?
          `, [
            product.Name,
            product.Title,
            product.Description,
            product.MetaTagDescription,
            product.IsActive,
            product.IsVisible,
            product.BrandId,
            product.CategoryId,
            product.DepartmentId,
            product.LinkId,
            product.KeyWords,
            product.TaxCode,
            product.SupplierId,
            product.ShowWithoutStock,
            product.Id
          ]);
          console.log(`✅ Produto atualizado: ${product.Name}`);
        } else {
          // Produto novo, inserir
          const insertResult = await executeModificationQuery(`
            INSERT INTO products_vtex (
              vtex_id, name, title, description, meta_tag_description,
              is_active, is_visible, brand_id, category_id, department_id,
              link_id, keywords, tax_code, supplier_id, show_without_stock,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            product.Id,
            product.Name,
            product.Title,
            product.Description,
            product.MetaTagDescription,
            product.IsActive,
            product.IsVisible,
            product.BrandId,
            product.CategoryId,
            product.DepartmentId,
            product.LinkId,
            product.KeyWords,
            product.TaxCode,
            product.SupplierId,
            product.ShowWithoutStock
          ]);
          productId = insertResult.insertId!;
          console.log(`✅ Produto inserido: ${product.Name} (ID: ${productId})`);
        }

        // PASSO 4: Processar SKUs
        console.log(`📋 PASSO 4: Processando ${productSkus.length} SKUs...`);
        let skuWithImages: any = null;
        let imagesFound = false;
        let firstSkuId: number | null = null;
        
        for (let i = 0; i < productSkus.length; i++) {
          const vtexSku = productSkus[i];
          console.log(`🔍 Processando SKU ${i + 1}/${productSkus.length}: ${vtexSku.Id} (${vtexSku.Name})`);
          
          // Set firstSkuId to the first SKU
          if (i === 0) {
            firstSkuId = vtexSku.Id;
          }
          
          // Verificar se SKU já existe
          const existingSku = await executeQuery(`
            SELECT id FROM skus_vtex WHERE id = ?
          `, [vtexSku.Id]);

          if (existingSku && existingSku.length > 0) {
            // SKU já existe, atualizar
            await executeQuery(`
              UPDATE skus_vtex SET
                product_id_vtex = ?,
                name = ?,
                ref_id = ?,
                is_active = ?,
                height = ?,
                width = ?,
                length = ?,
                weight_kg = ?,
                modal_id = ?,
                is_kit = ?,
                internal_note = ?,
                reward_value = ?,
                commercial_condition_id = ?,
                flag_kit_itens_sell_apart = ?,
                manufacturer_code = ?,
                position = ?,
                measurement_unit = ?,
                unit_multiplier = ?,
                updated_at = NOW()
              WHERE id = ?
            `, [
              productId,
              vtexSku.Name,
              vtexSku.RefId,
              vtexSku.IsActive,
              vtexSku.Height,
              vtexSku.Width,
              vtexSku.Length,
              vtexSku.WeightKg,
              vtexSku.ModalId,
              vtexSku.IsKit,
              vtexSku.InternalNote,
              vtexSku.RewardValue,
              vtexSku.CommercialConditionId,
              vtexSku.FlagKitItensSellApart,
              vtexSku.ManufacturerCode,
              vtexSku.Position,
              vtexSku.MeasurementUnit,
              vtexSku.UnitMultiplier,
              vtexSku.Id
            ]);
            console.log(`✅ SKU atualizado: ${vtexSku.Name}`);
          } else {
            // SKU novo, inserir
            await executeQuery(`
              INSERT INTO skus_vtex (
                id, product_id_vtex, name, ref_id, is_active, 
                height, width, length, weight_kg, modal_id, is_kit,
                internal_note, reward_value, commercial_condition_id,
                flag_kit_itens_sell_apart, manufacturer_code, position,
                measurement_unit, unit_multiplier, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
              vtexSku.Id,
              productId,
              vtexSku.Name,
              vtexSku.RefId,
              vtexSku.IsActive,
              vtexSku.Height,
              vtexSku.Width,
              vtexSku.Length,
              vtexSku.WeightKg,
              vtexSku.ModalId,
              vtexSku.IsKit,
              vtexSku.InternalNote,
              vtexSku.RewardValue,
              vtexSku.CommercialConditionId,
              vtexSku.FlagKitItensSellApart,
              vtexSku.ManufacturerCode,
              vtexSku.Position,
              vtexSku.MeasurementUnit,
              vtexSku.UnitMultiplier
            ]);
            console.log(`✅ SKU inserido: ${vtexSku.Name}`);
          }

          // PASSO 5: Verificar se este SKU tem imagens (só importar do primeiro que tiver)
          if (!imagesFound) {
            console.log(`🖼️ Verificando imagens do SKU ${vtexSku.Id}...`);
            try {
              const imagesResponse = await fetch(`${baseUrl}/api/catalog/pvt/stockkeepingunit/${vtexSku.Id}/file`, {
                method: 'GET',
                headers
              });
              
              if (imagesResponse.ok) {
                const images = await imagesResponse.json();
                console.log(`📸 SKU ${vtexSku.Id}: ${images.length} imagens encontradas`);
                
                if (images.length > 0) {
                  console.log(`✅ Imagens encontradas no SKU ${vtexSku.Id}! Importando...`);
                  skuWithImages = vtexSku;
                  imagesFound = true;
                  
                  for (const image of images) {
                    try {
                      await executeQuery(`
                        INSERT INTO images_vtex (
                          vtex_id, sku_id, name, url, is_main, position, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE
                          name = VALUES(name),
                          url = VALUES(url),
                          is_main = VALUES(is_main),
                          position = VALUES(position),
                          updated_at = NOW()
                      `, [
                        image.Id,
                        vtexSku.Id,
                        image.Name,
                        image.Url,
                        image.IsMain || false,
                        image.Position || 0
                      ]);
                    } catch (imageError: any) {
                      console.error(`❌ Erro ao importar imagem ${image.Id}:`, imageError);
                    }
                  }
                  console.log(`✅ ${images.length} imagens importadas do SKU ${vtexSku.Id}`);
                } else {
                  console.log(`❌ SKU ${vtexSku.Id} não possui imagens, tentando próximo...`);
                }
              } else {
                console.warn(`⚠️ Erro ao buscar imagens do SKU ${vtexSku.Id}: ${imagesResponse.status}`);
              }
            } catch (imageError: any) {
              console.error(`❌ Erro ao verificar imagens do SKU ${vtexSku.Id}:`, imageError);
            }
          } else {
            console.log(`⏭️ SKU ${vtexSku.Id} pulado - imagens já importadas do SKU ${skuWithImages?.Id}`);
          }

          // PASSO 6: Importar estoque do SKU (stock_vtex)
          console.log(`📦 PASSO 6: Importando estoque do SKU ${vtexSku.Id}...`);
          try {
            const stockApiUrl = `${baseUrl}/api/logistics/pvt/inventory/skus/${vtexSku.Id}`;
            
            const stockResponse = await fetch(stockApiUrl, {
              method: 'GET',
              headers
            });
            
            if (stockResponse.ok) {
              const stockData = await stockResponse.json();
              console.log(`📊 SKU ${vtexSku.Id}: ${stockData.balance?.length || 0} warehouses encontrados`);
              
              if (stockData.balance && Array.isArray(stockData.balance)) {
                // Filtrar apenas warehouse com nome "13"
                const warehouse13 = stockData.balance.filter((balance: any) => 
                  balance.warehouseName === "13"
                );
                
                console.log(`🏪 Warehouses com nome "13": ${warehouse13.length}`);
                
                for (const balance of warehouse13) {
                  try {
                    await executeQuery(
                      `INSERT INTO stock_vtex (
                        sku_id, vtex_sku_id, warehouse_id, warehouse_name, 
                        total_quantity, reserved_quantity, has_unlimited_quantity,
                        time_to_refill, date_of_supply_utc, lead_time,
                        created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                      ON DUPLICATE KEY UPDATE
                        total_quantity = VALUES(total_quantity),
                        reserved_quantity = VALUES(reserved_quantity),
                        has_unlimited_quantity = VALUES(has_unlimited_quantity),
                        time_to_refill = VALUES(time_to_refill),
                        date_of_supply_utc = VALUES(date_of_supply_utc),
                        lead_time = VALUES(lead_time),
                        updated_at = NOW()`,
                      [
                        vtexSku.Id, // sku_id é o ID da VTEX
                        vtexSku.Id.toString(),
                        balance.warehouseId,
                        balance.warehouseName,
                        balance.totalQuantity,
                        balance.reservedQuantity,
                        balance.hasUnlimitedQuantity,
                        balance.timeToRefill,
                        balance.dateOfSupplyUtc ? new Date(balance.dateOfSupplyUtc) : null,
                        balance.leadTime
                      ]
                    );
                    console.log(`✅ Estoque importado: SKU ${vtexSku.Id} - Warehouse: ${balance.warehouseName} - Qtd: ${balance.totalQuantity}`);
                  } catch (stockError: any) {
                    console.error(`❌ Erro ao importar estoque do warehouse ${balance.warehouseId}:`, stockError);
                  }
                }
              }
            } else {
              console.warn(`⚠️ Erro ao buscar estoque do SKU ${vtexSku.Id}: ${stockResponse.status}`);
            }
          } catch (stockError: any) {
            console.error(`❌ Erro ao importar estoque do SKU ${vtexSku.Id}:`, stockError);
          }
        }

        // 5. Buscar e processar imagens APENAS do primeiro SKU
        if (firstSkuId && productSkus.length > 0) {
          const firstSku = productSkus[0];
          try {
            console.log(`📸 Processando imagens apenas do primeiro SKU: ${firstSku.Id}`);
            const filesResponse = await fetch(`${baseUrl}/api/catalog/pvt/stockkeepingunit/${firstSku.Id}/file`, {
              method: 'GET',
              headers
            });

            if (filesResponse.ok) {
              const files: VTEXSKUFile[] = await filesResponse.json();
              
              for (const file of files) {
                // Verificar se arquivo já existe
                const existingFile = await executeQuery(`
                  SELECT id FROM sku_files WHERE vtex_id = ?
                `, [file.Id]);

                if (existingFile && existingFile.length > 0) {
                  // Arquivo já existe, atualizar
                  await executeQuery(`
                    UPDATE sku_files SET
                      sku_id = ?,
                      name = ?,
                      is_main = ?,
                      label = ?,
                      text = ?,
                      url = ?,
                      file_location = ?,
                      position = ?,
                      updated_at = CURRENT_TIMESTAMP
                    WHERE vtex_id = ?
                  `, [
                    firstSkuId,
                    file.Name,
                    file.IsMain,
                    file.Label,
                    file.Text,
                    file.Url,
                    file.FileLocation,
                    file.Position,
                    file.Id
                  ]);
                } else {
                  // Arquivo novo, inserir
                  await executeQuery(`
                    INSERT INTO sku_files (
                      vtex_id, sku_id, name, is_main, label, text, url, file_location, position,
                      created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  `, [
                    file.Id,
                    firstSkuId,
                    file.Name,
                    file.IsMain,
                    file.Label,
                    file.Text,
                    file.Url,
                    file.FileLocation,
                    file.Position
                  ]);
                }
              }
              console.log(`📸 ${files.length} imagens processadas para o primeiro SKU ${firstSku.Id}`);
            }
          } catch (fileError) {
            console.warn(`⚠️ Erro ao processar imagens do primeiro SKU ${firstSku.Id}:`, fileError);
          }
        }

        results.successful++;
        results.imported.push({
          sku,
          product_name: product.Name,
          product_id: productId
        });

      } catch (error: any) {
        console.error(`❌ Erro ao processar SKU ${sku}:`, error);
        results.errors.push({ sku, message: error instanceof Error ? error.message : String(error) || 'Erro desconhecido' });
        results.failed++;
      }
    }

    console.log(`✅ Importação concluída: ${results.successful} sucessos, ${results.failed} falhas`);

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.successful} sucessos, ${results.failed} falhas`,
      data: results
    });

  } catch (error: any) {
    console.error('❌ Erro na importação de SKUs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor na importação de SKUs'
    }, { status: 500 });
  }
}

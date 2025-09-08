import { NextRequest, NextResponse } from 'next/server';
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
    const { skus } = await request.json();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de SKUs é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando importação de ${skus.length} SKUs`);

    // Buscar configurações da VTEX
    const configRows = await executeQuery(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
    `);

    const config: Record<string, string> = {};
    configRows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    if (!config.vtex_account_name || !config.vtex_environment || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações da VTEX não encontradas. Configure em Configurações > VTEX.'
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

        // 3. Verificar se o produto já existe
        const existingProduct = await executeQuery(`
          SELECT id FROM products WHERE vtex_id = ?
        `, [product.Id]);

        let productId: number;

        if (existingProduct && existingProduct.length > 0) {
          // Produto já existe, atualizar
          productId = existingProduct[0].id;
          await executeQuery(`
            UPDATE products SET
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
            INSERT INTO products (
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

        // 4. Processar SKUs
        let firstSkuId = null;
        for (let i = 0; i < productSkus.length; i++) {
          const vtexSku = productSkus[i];
          const isFirstSku = i === 0;
          
          // Verificar se SKU já existe
          const existingSku = await executeQuery(`
            SELECT id FROM skus WHERE vtex_id = ?
          `, [vtexSku.Id]);

          let skuId;
          if (existingSku && existingSku.length > 0) {
            // SKU já existe, atualizar
            skuId = existingSku[0].id;
            await executeQuery(`
              UPDATE skus SET
                product_id = ?,
                name = ?,
                is_active = ?,
                height = ?,
                width = ?,
                length = ?,
                weight_kg = ?,
                modal_id = ?,
                ref_id = ?,
                cubic_weight = ?,
                is_kit = ?,
                internal_note = ?,
                reward_value = ?,
                commercial_condition_id = ?,
                flag_kit_itens_sell_apart = ?,
                manufacturer_code = ?,
                measurement_unit = ?,
                unit_multiplier = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE vtex_id = ?
            `, [
              productId,
              vtexSku.Name,
              vtexSku.IsActive,
              vtexSku.Height,
              vtexSku.Width,
              vtexSku.Length,
              vtexSku.WeightKg,
              vtexSku.ModalId,
              vtexSku.RefId,
              vtexSku.CubicWeight,
              vtexSku.IsKit,
              vtexSku.InternalNote,
              vtexSku.RewardValue,
              vtexSku.CommercialConditionId,
              vtexSku.FlagKitItensSellApart,
              vtexSku.ManufacturerCode,
              vtexSku.MeasurementUnit,
              vtexSku.UnitMultiplier,
              vtexSku.Id
            ]);
          } else {
            // SKU novo, inserir
            const insertResult = await executeModificationQuery(`
              INSERT INTO skus (
                vtex_id, product_id, name, is_active, height, width, length,
                weight_kg, modal_id, ref_id, cubic_weight, is_kit, internal_note,
                reward_value, commercial_condition_id, flag_kit_itens_sell_apart,
                manufacturer_code, measurement_unit, unit_multiplier,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              vtexSku.Id,
              productId,
              vtexSku.Name,
              vtexSku.IsActive,
              vtexSku.Height,
              vtexSku.Width,
              vtexSku.Length,
              vtexSku.WeightKg,
              vtexSku.ModalId,
              vtexSku.RefId,
              vtexSku.CubicWeight,
              vtexSku.IsKit,
              vtexSku.InternalNote,
              vtexSku.RewardValue,
              vtexSku.CommercialConditionId,
              vtexSku.FlagKitItensSellApart,
              vtexSku.ManufacturerCode,
              vtexSku.MeasurementUnit,
              vtexSku.UnitMultiplier
            ]);
            skuId = insertResult.insertId!;
          }

          // Guardar ID do primeiro SKU para processar imagens
          if (isFirstSku) {
            firstSkuId = skuId;
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

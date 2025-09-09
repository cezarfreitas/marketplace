import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';
import { executeQuery } from '@/lib/db-ultra-simple';

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Recebendo requisição de importação...');
    const body = await request.json();
    console.log('📦 Body recebido:', body);
    
    const { refId } = body;

    if (!refId) {
      console.log('❌ Nenhum RefId fornecido');
      return NextResponse.json({
        success: false,
        message: 'RefId é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔄 Buscando produto RefId ${refId} na VTEX...`);
    
    // Buscar produto na VTEX
    const product = await vtexService.getProductByRefId(refId);
    console.log(`✅ Produto encontrado:`, product.Name);
    
    // Buscar marca na VTEX
    console.log(`🏷️ Buscando marca ID ${product.BrandId} na VTEX...`);
    const brand = await vtexService.getBrand(product.BrandId);
    console.log(`✅ Marca encontrada:`, brand.name);
    
    // Buscar categoria na VTEX
    console.log(`📂 Buscando categoria ID ${product.CategoryId} na VTEX...`);
    const category = await vtexService.getCategory(product.CategoryId);
    console.log(`✅ Categoria encontrada:`, category.Name);
    
    // Inserir marca no banco
    console.log(`🏷️ Inserindo marca no banco...`);
    const [brandResult] = await executeQuery(
      `INSERT INTO brands (vtex_id, name, is_active, title, meta_tag_description, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), updated_at = NOW()`,
      [
        brand.id,
        brand.name,
        brand.isActive,
        brand.title || null,
        brand.metaTagDescription || null,
        brand.imageUrl || null
      ]
    );
    console.log(`✅ Marca inserida no banco:`, brandResult);
    
    // Inserir categoria no banco
    console.log(`📂 Inserindo categoria no banco...`);
    const [categoryResult] = await executeQuery(
      `INSERT INTO categories (vtex_id, name, father_category_id, title, description, keywords, is_active, lomadee_campaign_code, adwords_remarketing_code, show_in_store_front, show_brand_filter, active_store_front_link, global_category_id, stock_keeping_unit_selection_mode, score, link_id, has_children, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), title = VALUES(title), description = VALUES(description), updated_at = NOW()`,
      [
        category.Id,
        category.Name,
        category.FatherCategoryId,
        category.Title,
        category.Description || null,
        category.Keywords || null,
        category.IsActive,
        category.LomadeeCampaignCode || null,
        category.AdWordsRemarketingCode || null,
        category.ShowInStoreFront,
        category.ShowBrandFilter,
        category.ActiveStoreFrontLink,
        category.GlobalCategoryId || null,
        category.StockKeepingUnitSelectionMode || null,
        category.Score || null,
        category.LinkId || null,
        category.HasChildren
      ]
    );
    console.log(`✅ Categoria inserida no banco:`, categoryResult);
    
    // Buscar ID interno da marca
    const [brandRow] = await executeQuery(
      'SELECT id FROM brands WHERE vtex_id = ?',
      [brand.id]
    );
    const brandId = (brandRow as any)[0]?.id;
    console.log(`✅ ID interno da marca: ${brandId}`);
    
    // Buscar ID interno da categoria
    const [categoryRow] = await executeQuery(
      'SELECT id FROM categories WHERE vtex_id = ?',
      [category.Id]
    );
    const categoryId = (categoryRow as any)[0]?.id;
    console.log(`✅ ID interno da categoria: ${categoryId}`);
    
    // Inserir produto no banco
    console.log(`📦 Inserindo produto no banco...`);
    const [productResult] = await executeQuery(
      `INSERT INTO products (vtex_id, name, department_id, category_id, brand_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), brand_id = VALUES(brand_id), category_id = VALUES(category_id), updated_at = NOW()`,
      [
        product.Id,
        product.Name,
        product.DepartmentId,
        categoryId, // Usar ID interno da categoria
        brandId,    // Usar ID interno da marca
        product.RefId,
        product.IsVisible,
        product.Description,
        product.Title,
        product.IsActive
      ]
    );
    console.log(`✅ Produto inserido no banco:`, productResult);
    
    // Buscar ID interno do produto
    const [productRow] = await executeQuery(
      'SELECT id FROM products WHERE vtex_id = ?',
      [product.Id]
    );
    const productId = (productRow as any)[0]?.id;
    console.log(`✅ ID interno do produto: ${productId}`);
    
    // Buscar SKUs na VTEX
    console.log(`📋 Buscando SKUs do produto ID ${product.Id} na VTEX...`);
    const skus = await vtexService.getProductSKUs(product.Id);
    console.log(`✅ ${skus.length} SKUs encontrados`);
    
    // Inserir SKUs no banco
        const skuResults = [];
    let firstSkuId = null;
    
    for (const sku of skus) {
      console.log(`📋 Inserindo SKU ${sku.Id}...`);
      const [skuResult] = await executeQuery(
        `INSERT INTO skus (vtex_id, product_id, name_complete, complement_name, product_name, product_description, product_ref_id, tax_code, sku_name, is_active, is_transported, is_inventoried, is_gift_card_recharge, image_url, detail_url, csc_identification, brand_id, brand_name, manufacturer_code, is_kit, commercial_condition_id, reward_value, estimated_date_arrival, measurement_unit, unit_multiplier, information_source, modal_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         sku_name = VALUES(sku_name), is_active = VALUES(is_active), updated_at = NOW()`,
        [
          sku.Id,
          productId, // Usar ID interno do produto
          sku.Name || null,
          sku.Name || null, // complement_name
          product.Name, // product_name
          product.Description || null, // product_description
          product.RefId || null, // product_ref_id
          null, // tax_code
          sku.Name || null, // sku_name
          sku.IsActive,
          sku.IsTransported || false,
          sku.IsInventoried || false,
          sku.IsGiftCardRecharge || false,
          null, // image_url
          null, // detail_url
          null, // csc_identification
          brand.id.toString(), // brand_id
          brand.name, // brand_name
          sku.ManufacturerCode || null,
          sku.IsKit || false,
          sku.CommercialConditionId || null,
          sku.RewardValue || 0,
          sku.EstimatedDateArrival || null,
          sku.MeasurementUnit || 'un',
          sku.UnitMultiplier || 1,
          'vtex', // information_source
          sku.ModalType || 'default'
        ]
      );
      skuResults.push(skuResult);
      console.log(`✅ SKU ${sku.Id} inserido`);
      
      // Guardar ID do primeiro SKU para buscar imagens
      if (!firstSkuId) {
        firstSkuId = sku.Id;
      }
    }
    
    // Buscar imagens em todos os SKUs até encontrar imagens
    let images: any[] = [];
    const imageResults: any[] = [];
    let skuWithImages: any = null;
    
    if (skus.length > 0) {
      console.log(`🖼️ Buscando imagens em ${skus.length} SKUs...`);
      
      // Tentar buscar imagens em cada SKU até encontrar
      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i];
        console.log(`🔍 Verificando SKU ${i + 1}/${skus.length}: ${sku.Id} (${sku.Name || 'N/A'})`);
        
        try {
          const skuImages = await vtexService.getSKUImages(sku.Id);
          console.log(`📊 SKU ${sku.Id}: ${skuImages.length} imagens encontradas`);
          
          if (skuImages.length > 0) {
            console.log(`✅ Imagens encontradas no SKU ${sku.Id}! Parando busca.`);
            images = skuImages;
            skuWithImages = sku;
            break; // Parar assim que encontrar imagens
          } else {
            console.log(`❌ SKU ${sku.Id} não possui imagens, tentando próximo...`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar imagens do SKU ${sku.Id}:`, (error as Error).message);
          // Continuar para o próximo SKU em caso de erro
        }
      }
      
      // Se encontrou imagens, inserir no banco
      if (images.length > 0 && skuWithImages) {
        console.log(`🖼️ Inserindo ${images.length} imagens do SKU ${skuWithImages.Id}...`);
        
        // Buscar ID interno do SKU que tem imagens
        const [skuRow] = await executeQuery(
          'SELECT id FROM skus WHERE vtex_id = ?',
          [skuWithImages.Id]
        );
        const skuInternalId = (skuRow as any)[0]?.id;
        
        if (skuInternalId) {
          // Inserir imagens no banco
          for (const image of images) {
            console.log(`🖼️ Inserindo imagem ${image.Id}...`);
            const [imageResult] = await executeQuery(
              `INSERT INTO images (vtex_id, archive_id, sku_id, name, is_main, text, label, url, file_location, position, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE 
               name = VALUES(name), is_main = VALUES(is_main), updated_at = NOW()`,
              [
                image.Id,
                image.ArchiveId || null,
                skuInternalId, // Usar ID interno do SKU que tem imagens
                image.Name || null,
                image.IsMain || false,
                image.Text || null,
                image.Label || null,
                image.Url || null,
                image.FileLocation || null,
                image.Position || 0
              ]
            );
            imageResults.push(imageResult);
            console.log(`✅ Imagem ${image.Id} inserida`);
          }
        }
      } else {
        console.log(`❌ Nenhuma imagem encontrada em nenhum dos ${skus.length} SKUs`);
      }
    }
    
    // 6. Importar estoque de todos os SKUs
    console.log(`\n📦 6. Importando estoque de ${skus.length} SKUs...`);
    const stockResults: any[] = [];
    let stockSuccessCount = 0;
    let stockErrorCount = 0;
    
    for (const sku of skus) {
      if (!sku.Id) continue;
      
      console.log(`🔍 Importando estoque do SKU ${sku.Id}...`);
      
      try {
        // Buscar dados de estoque da API VTEX
        const config = vtexService.getConfig();
        const stockApiUrl = `https://${config.accountName}.${config.environment}.com.br/api/logistics/pvt/inventory/skus/${sku.Id}`;
        
        const stockResponse = await fetch(stockApiUrl, {
          method: 'GET',
          headers: {
            'X-VTEX-API-AppKey': config.appKey,
            'X-VTEX-API-AppToken': config.appToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          console.log(`📊 SKU ${sku.Id}: ${stockData.balance?.length || 0} warehouses encontrados`);
          
          // Buscar ID interno do SKU
          const [skuRow] = await executeQuery(
            'SELECT id FROM skus WHERE vtex_id = ?',
            [sku.Id]
          );
          const skuInternalId = (skuRow as any)[0]?.id;
          
          if (skuInternalId && stockData.balance && Array.isArray(stockData.balance)) {
            // Inserir dados de estoque no banco
            for (const balance of stockData.balance) {
              try {
                await executeQuery(`
                  INSERT INTO stock (
                    sku_id, vtex_sku_id, warehouse_id, warehouse_name,
                    total_quantity, reserved_quantity, has_unlimited_quantity,
                    time_to_refill, date_of_supply_utc, lead_time
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                    total_quantity = VALUES(total_quantity),
                    reserved_quantity = VALUES(reserved_quantity),
                    has_unlimited_quantity = VALUES(has_unlimited_quantity),
                    time_to_refill = VALUES(time_to_refill),
                    date_of_supply_utc = VALUES(date_of_supply_utc),
                    lead_time = VALUES(lead_time),
                    updated_at = CURRENT_TIMESTAMP
                `, [
                  skuInternalId,
                  sku.Id,
                  balance.warehouseId,
                  balance.warehouseName,
                  balance.totalQuantity || 0,
                  balance.reservedQuantity || 0,
                  balance.hasUnlimitedQuantity || false,
                  balance.timeToRefill,
                  balance.dateOfSupplyUtc ? new Date(balance.dateOfSupplyUtc) : null,
                  balance.leadTime
                ]);
                
                console.log(`✅ Estoque inserido: ${balance.warehouseName} - Qtd: ${balance.totalQuantity}`);
                stockResults.push({
                  skuId: sku.Id,
                  warehouseId: balance.warehouseId,
                  warehouseName: balance.warehouseName,
                  totalQuantity: balance.totalQuantity,
                  reservedQuantity: balance.reservedQuantity
                });
                
              } catch (insertError) {
                console.error(`❌ Erro ao inserir estoque para warehouse ${balance.warehouseId}:`, (insertError as Error).message);
                stockErrorCount++;
              }
            }
            
            stockSuccessCount++;
          }
        } else {
          console.log(`⚠️ Erro na API de estoque para SKU ${sku.Id}: ${stockResponse.status}`);
          stockErrorCount++;
        }
      } catch (error) {
        console.error(`❌ Erro ao importar estoque do SKU ${sku.Id}:`, (error as Error).message);
        stockErrorCount++;
      }
    }
    
    console.log(`📊 Resumo do estoque: ${stockSuccessCount} SKUs processados, ${stockErrorCount} erros`);
    
    return NextResponse.json({
      success: true,
      message: `Produto ${refId}, marca, categoria, ${skus.length} SKUs, ${images.length} imagens e estoque de ${stockSuccessCount} SKUs importados com sucesso!`,
      data: {
        product: product,
        brand: brand,
        category: category,
        skus: skus,
        images: images,
        stock: stockResults,
        productId: product.Id,
        productName: product.Name,
        brandId: brand.id,
        brandName: brand.name,
        categoryId: category.Id,
        categoryName: category.Name,
        skuCount: skus.length,
        imageCount: images.length,
        stockCount: stockResults.length,
        stockSuccessCount: stockSuccessCount,
        stockErrorCount: stockErrorCount,
        firstSkuId: firstSkuId,
        insertResult: {
          brand: brandResult,
          category: categoryResult,
          product: productResult,
          skus: skuResults,
          images: imageResults,
          stock: stockResults
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na API de importação:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na importação do produto',
      error: error.message
    }, { status: 400 });
  }
}
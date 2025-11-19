import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';
import { executeQuery } from '@/lib/db-ultra-simple';
import { checkBuildEnvironment } from '@/lib/build-check';

// Função auxiliar para salvar marca e categoria
async function saveBrandAndCategory(brand: any, category: any) {
  // Inserir marca no banco
  console.log(`🏷️ Inserindo marca no banco...`);
  await executeQuery(
    `INSERT INTO brands (vtex_id, name, is_active, title, meta_tag_description, image_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE 
     name = VALUES(name), is_active = VALUES(is_active), title = VALUES(title), 
     meta_tag_description = VALUES(meta_tag_description), image_url = VALUES(image_url), 
     updated_at = NOW()`,
    [
      brand.id,
      brand.name,
      brand.isActive,
      brand.title || null,
      brand.metaTagDescription || null,
      brand.imageUrl || null
    ]
  );
  console.log(`✅ Marca inserida no banco (contexto preservado se já existir)`);

  // Inserir categoria no banco
  console.log(`📂 Inserindo categoria no banco...`);
  await executeQuery(
    `INSERT INTO categories_vtex (vtex_id, name, father_category_id, title, description, keywords, is_active, lomadee_campaign_code, adwords_remarketing_code, show_in_store_front, show_brand_filter, active_store_front_link, global_category_id, stock_keeping_unit_selection_mode, score, link_id, has_children, tree_path, tree_path_ids, tree_path_link_ids, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
      category.HasChildren,
      category.TreePath ? JSON.stringify(category.TreePath) : null,
      category.TreePathIds ? JSON.stringify(category.TreePathIds) : null,
      category.TreePathLinkIds ? JSON.stringify(category.TreePathLinkIds) : null
    ]
  );
  console.log(`✅ Categoria inserida no banco`);
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }
    
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
    
    // Verificar se o produto já existe na products_vtex
    console.log(`🔍 Verificando se produto já existe na products_vtex...`);
    const existingProductVtex = await executeQuery(
      'SELECT id_produto_vtex, id_category_vtex, id_brand_vtex FROM products_vtex WHERE id_produto_vtex = ?',
      [product.Id]
    );
    
    let categoryId, brandId;
    let brand, category;
    let brandResult, categoryResult;
    
    if (existingProductVtex && Array.isArray(existingProductVtex) && existingProductVtex.length > 0) {
      // Produto já existe na products_vtex, usar os IDs existentes
      console.log(`✅ Produto já existe na products_vtex`);
      categoryId = (existingProductVtex[0] as any).id_category_vtex;
      brandId = (existingProductVtex[0] as any).id_brand_vtex;
      console.log(`📂 Usando category_id existente: ${categoryId}`);
      console.log(`🏷️ Usando brand_id existente: ${brandId}`);
      
      // Buscar dados da marca e categoria para o retorno
      const brandRow = await executeQuery('SELECT vtex_id, name FROM brands WHERE id = ?', [brandId]);
      const categoryRow = await executeQuery('SELECT vtex_id, name FROM categories_vtex WHERE vtex_id = ?', [categoryId]);
      
      brand = { id: (brandRow as any)[0]?.vtex_id, name: (brandRow as any)[0]?.name };
      category = { Id: (categoryRow as any)[0]?.vtex_id, Name: (categoryRow as any)[0]?.name };
      
      // Criar variáveis de resultado para o retorno
      brandResult = { success: true, id: brandId };
      categoryResult = { success: true, id: categoryId };
    } else {
      // Produto não existe, buscar marca e categoria da VTEX
      console.log(`📦 Produto não existe na products_vtex, buscando dados da VTEX...`);
      
      // Buscar marca na VTEX
      console.log(`🏷️ Buscando marca ID ${product.BrandId} na VTEX...`);
      brand = await vtexService.getBrand(product.BrandId);
      console.log(`✅ Marca encontrada:`, brand.name);
      
      // Buscar categoria na VTEX
      console.log(`📂 Buscando categoria ID ${product.CategoryId} na VTEX...`);
      category = await vtexService.getCategory(product.CategoryId);
      console.log(`✅ Categoria encontrada:`, category.Name);
      
      // Salvar marca e categoria primeiro
      await saveBrandAndCategory(brand, category);
      
      // Buscar IDs internos
      const brandRow = await executeQuery('SELECT id FROM brands WHERE vtex_id = ?', [brand.id]);
      const categoryRow = await executeQuery('SELECT vtex_id FROM categories_vtex WHERE vtex_id = ?', [category.Id]);
      
      brandId = (brandRow as any)[0]?.id;
      categoryId = (categoryRow as any)[0]?.vtex_id;
      
      // Criar variáveis de resultado para o retorno
      brandResult = { success: true, id: brandId };
      categoryResult = { success: true, id: categoryId };
      
      // Salvar produto na products_vtex
      await executeQuery(
        `INSERT INTO products_vtex (vtex_id, name, department_id, id_category_vtex, id_brand_vtex, ref_produto, is_visible, description, title, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
        [
          product.Id,
          product.Name,
          product.DepartmentId,
          categoryId,
          brandId,
          product.RefId,
          product.IsVisible,
          product.Description,
          product.Title,
          product.IsActive
        ]
      );
      console.log(`✅ Produto salvo na products_vtex`);
    }
    
    // Inserir produto no banco (tabela products)
    console.log(`📦 Inserindo produto na tabela products...`);
    const [productResult] = await executeQuery(
      `INSERT INTO products_vtex (vtex_id, name, department_id, category_id, brand_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
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
    console.log(`✅ Produto inserido na tabela products:`, productResult);
    
    // Buscar ID interno do produto
    const productRow = await executeQuery(
      'SELECT id FROM products_vtex WHERE vtex_id = ?',
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
      const skuResult = await executeQuery(
        `INSERT INTO skus (
          vtex_id, product_id, name_complete, complement_name, product_name, product_description, 
          product_ref_id, tax_code, sku_name, ref_id, height, real_height, width, real_width, 
          length, real_length, weight_kg, real_weight_kg, modal_id, cubic_weight, internal_note, 
          date_updated, is_active, is_transported, is_inventoried, is_gift_card_recharge, 
          image_url, detail_url, csc_identification, brand_id, brand_name, manufacturer_code, 
          is_kit, commercial_condition_id, reward_value, estimated_date_arrival, measurement_unit, 
          unit_multiplier, information_source, modal_type, flag_kit_itens_sell_apart, 
          reference_stock_keeping_unit_id, position, activate_if_possible, is_kit_optimized, 
          created_at, updated_at
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name_complete = VALUES(name_complete), 
         sku_name = VALUES(sku_name), 
         ref_id = VALUES(ref_id),
         height = VALUES(height),
         real_height = VALUES(real_height),
         width = VALUES(width),
         real_width = VALUES(real_width),
         length = VALUES(length),
         real_length = VALUES(real_length),
         weight_kg = VALUES(weight_kg),
         real_weight_kg = VALUES(real_weight_kg),
         modal_id = VALUES(modal_id),
         cubic_weight = VALUES(cubic_weight),
         internal_note = VALUES(internal_note),
         date_updated = VALUES(date_updated),
         is_active = VALUES(is_active), 
         is_transported = VALUES(is_transported),
         is_inventoried = VALUES(is_inventoried),
         is_gift_card_recharge = VALUES(is_gift_card_recharge),
         manufacturer_code = VALUES(manufacturer_code),
         is_kit = VALUES(is_kit),
         commercial_condition_id = VALUES(commercial_condition_id),
         reward_value = VALUES(reward_value),
         estimated_date_arrival = VALUES(estimated_date_arrival),
         measurement_unit = VALUES(measurement_unit),
         unit_multiplier = VALUES(unit_multiplier),
         modal_type = VALUES(modal_type),
         flag_kit_itens_sell_apart = VALUES(flag_kit_itens_sell_apart),
         reference_stock_keeping_unit_id = VALUES(reference_stock_keeping_unit_id),
         position = VALUES(position),
         activate_if_possible = VALUES(activate_if_possible),
         is_kit_optimized = VALUES(is_kit_optimized),
         updated_at = NOW()`,
        [
          sku.Id,
          productId, // Usar ID interno do produto
          sku.Name || null, // name_complete
          sku.Name || null, // complement_name
          product.Name, // product_name
          product.Description || null, // product_description
          product.RefId || null, // product_ref_id
          null, // tax_code
          sku.Name || null, // sku_name
          sku.RefId || null, // ref_id
          sku.Height || null, // height
          sku.RealHeight || null, // real_height
          sku.Width || null, // width
          sku.RealWidth || null, // real_width
          sku.Length || null, // length
          sku.RealLength || null, // real_length
          sku.WeightKg || null, // weight_kg
          sku.RealWeightKg || null, // real_weight_kg
          sku.ModalId || null, // modal_id
          sku.CubicWeight || null, // cubic_weight
          sku.InternalNote || null, // internal_note
          sku.DateUpdated || null, // date_updated
          sku.IsActive,
          sku.IsTransported,
          sku.IsInventoried,
          sku.IsGiftCardRecharge,
          null, // image_url
          null, // detail_url
          null, // csc_identification
          brandId?.toString() || null, // brand_id
          null, // brand_name (não disponível no escopo atual)
          sku.ManufacturerCode || null,
          sku.IsKit || false,
          sku.CommercialConditionId || null,
          sku.RewardValue || 0,
          sku.EstimatedDateArrival || null,
          sku.MeasurementUnit || 'un',
          sku.UnitMultiplier || 1,
          'vtex', // information_source
          sku.ModalType || 'default',
          sku.FlagKitItensSellApart || false,
          sku.ReferenceStockKeepingUnitId || null,
          sku.Position || null,
          sku.ActivateIfPossible || true,
          (sku as any).isKitOptimized || false
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
        const skuRow = await executeQuery(
          'SELECT id FROM skus_vtex WHERE vtex_id = ?',
          [skuWithImages.Id]
        );
        const skuInternalId = (skuRow as any)[0]?.id;
        
        if (skuInternalId) {
          // Inserir imagens no banco
          for (const image of images) {
            console.log(`🖼️ Inserindo imagem ${image.Id}...`);
            const imageResult = await executeQuery(
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
          const skuRow = await executeQuery(
            'SELECT id FROM skus_vtex WHERE vtex_id = ?',
            [sku.Id]
          );
          const skuInternalId = (skuRow as any)[0]?.id;
          
          if (skuInternalId && stockData.balance && Array.isArray(stockData.balance)) {
            // Inserir dados de estoque no banco
            for (const balance of stockData.balance) {
              try {
                await executeQuery(`
                  INSERT INTO stock_vtex (
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
        brand: { id: brandId, name: 'N/A' },
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
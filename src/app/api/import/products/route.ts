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
    
    // Buscar imagens do primeiro SKU na VTEX
    let images: any[] = [];
        const imageResults: any[] = [];
    
    if (firstSkuId) {
      console.log(`🖼️ Buscando imagens do primeiro SKU ${firstSkuId} na VTEX...`);
      try {
        images = await vtexService.getSKUImages(firstSkuId);
        console.log(`✅ ${images.length} imagens encontradas`);
        
        // Buscar ID interno do primeiro SKU
        const [firstSkuRow] = await executeQuery(
          'SELECT id FROM skus WHERE vtex_id = ?',
          [firstSkuId]
        );
        const firstSkuInternalId = (firstSkuRow as any)[0]?.id;
        
        if (firstSkuInternalId) {
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
                firstSkuInternalId, // Usar ID interno do SKU
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
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar imagens do SKU ${firstSkuId}:`, (error as Error).message);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Produto ${refId}, marca, categoria, ${skus.length} SKUs e ${images.length} imagens importados com sucesso!`,
      data: {
        product: product,
        brand: brand,
        category: category,
        skus: skus,
        images: images,
        productId: product.Id,
        productName: product.Name,
        brandId: brand.id,
        brandName: brand.name,
        categoryId: category.Id,
        categoryName: category.Name,
        skuCount: skus.length,
        imageCount: images.length,
        firstSkuId: firstSkuId,
        insertResult: {
          brand: brandResult,
          category: categoryResult,
          product: productResult,
          skus: skuResults,
          images: imageResults
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
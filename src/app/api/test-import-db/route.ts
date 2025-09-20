import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando importação com inserção no banco...');

    // Dados simulados do produto NFL
    const productData = {
      product: {
        Id: 203724123,
        Name: "Camiseta NFL Oversize Los Angeles Chargers Name Number Justin Herbert Azul",
        DepartmentId: 15277,
        IsVisible: true,
        Description: "Camiseta NFL Oversize Los Angeles Chargers Name Number Justin Herbert Azul",
        Title: "Camiseta NFL Oversize Los Angeles Chargers Name Number Justin Herbert Azul",
        IsActive: true
      },
      brand: {
        id: 2000930,
        name: "NFL",
        isActive: true
      },
      category: {
        Id: 15301,
        Name: "Camisetas",
        FatherCategoryId: 0,
        Title: "Camisetas",
        IsActive: true
      }
    };

    // 1. Inserir marca
    console.log('🏷️ Inserindo marca...');
    const [brandResult] = await executeQuery(
      `INSERT INTO brands (vtex_id, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), is_active = VALUES(is_active), updated_at = NOW()`,
      [productData.brand.id, productData.brand.name, productData.brand.isActive]
    );
    console.log('✅ Marca inserida:', brandResult);

    // Buscar ID da marca
    const [brandRow] = await executeQuery(
      'SELECT id FROM brands WHERE vtex_id = ?',
      [productData.brand.id]
    );
    const brandId = brandRow[0]?.id;
    console.log('✅ ID da marca:', brandId);

    // 2. Inserir categoria
    console.log('📂 Inserindo categoria...');
    const [categoryResult] = await executeQuery(
      `INSERT INTO categories (vtex_id, name, father_category_id, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), title = VALUES(title), updated_at = NOW()`,
      [productData.category.Id, productData.category.Name, productData.category.FatherCategoryId, productData.category.Title, productData.category.IsActive]
    );
    console.log('✅ Categoria inserida:', categoryResult);

    // Buscar ID da categoria
    const [categoryRow] = await executeQuery(
      'SELECT id FROM categories WHERE vtex_id = ?',
      [productData.category.Id]
    );
    const categoryId = categoryRow[0]?.id;
    console.log('✅ ID da categoria:', categoryId);

    // 3. Inserir produto
    console.log('📦 Inserindo produto...');
    const [productResult] = await executeQuery(
      `INSERT INTO products_vtex (vtex_id, name, department_id, id_category_vtex, id_brand_vtex, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [
        productData.product.Id,
        productData.product.Name,
        productData.product.DepartmentId,
        categoryId,
        brandId,
        productData.product.IsVisible,
        productData.product.Description,
        productData.product.Title,
        productData.product.IsActive
      ]
    );
    console.log('✅ Produto inserido:', productResult);

    return NextResponse.json({
      success: true,
      message: 'Importação com inserção no banco testada com sucesso!',
      data: {
        brandId,
        categoryId,
        productInserted: true
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de importação com banco:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste de importação com banco',
      error: error.message
    }, { status: 400 });
  }
}

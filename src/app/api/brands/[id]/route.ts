import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const brandId = parseInt(params.id);

    if (isNaN(brandId)) {
      return NextResponse.json({
        success: false,
        message: 'ID da marca inválido'
      }, { status: 400 });
    }

    console.log(`🔄 Deletando marca ID: ${brandId}`);

    // Verificar se a marca existe
    const existingBrand = await executeQuery(
      'SELECT id, name FROM brands_vtex WHERE id = ?',
      [brandId]
    );

    if (!existingBrand || existingBrand.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    const brand = existingBrand[0] as any;
    console.log(`📊 Marca encontrada: ${brand.name}`);

    // Verificar se há produtos associados
    const productsCount = await executeQuery(
      'SELECT COUNT(*) as count FROM products_vtex WHERE brand_id = (SELECT vtex_id FROM brands_vtex WHERE id = ?)',
      [brandId]
    );

    const productCount = productsCount[0]?.count || 0;
    
    if (productCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Não é possível excluir a marca "${brand.name}" pois ela possui ${productCount} produto(s) associado(s). Remova os produtos primeiro.`
      }, { status: 400 });
    }

    // Deletar a marca
    await executeQuery(
      'DELETE FROM brands_vtex WHERE id = ?',
      [brandId]
    );

    console.log(`✅ Marca "${brand.name}" deletada com sucesso`);

    return NextResponse.json({
      success: true,
      message: `Marca "${brand.name}" deletada com sucesso`
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar marca:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar marca',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const brandId = parseInt(params.id);

    if (isNaN(brandId)) {
      return NextResponse.json({
        success: false,
        message: 'ID da marca inválido'
      }, { status: 400 });
    }

    console.log(`🔄 Buscando marca ID: ${brandId}`);

    // Buscar marca com contagem de produtos
    const brandQuery = `
      SELECT 
        b.id, 
        b.vtex_id, 
        b.name, 
        b.is_active, 
        b.title, 
        b.meta_tag_description, 
        b.image_url, 
        b.brand_history, 
        b.target_audience, 
        b.language_type, 
        b.consumption_behavior, 
        b.visual_style, 
        b.auxiliary_data_generated, 
        b.brand_analysis, 
        b.created_at,
        b.updated_at,
        COALESCE(p.product_count, 0) as product_count
      FROM brands_vtex b
      LEFT JOIN (
        SELECT brand_id, COUNT(*) as product_count 
        FROM products_vtex 
        GROUP BY brand_id
      ) p ON b.vtex_id = p.brand_id
      WHERE b.id = ?
    `;

    const brands = await executeQuery(brandQuery, [brandId]);

    if (!brands || brands.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    const brand = brands[0] as any;
    console.log(`✅ Marca encontrada: ${brand.name}`);

    return NextResponse.json({
      success: true,
      data: brand
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar marca:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar marca',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

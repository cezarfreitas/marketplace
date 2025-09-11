import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Atributos que devem ser desconsiderados na importação
const EXCLUDED_ATTRIBUTES = ['Seller', 'Categoria'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    // Buscar atributos do produto
    const attributes = await executeQuery(
      `SELECT 
        attribute_id,
        attribute_name,
        attribute_values,
        created_at,
        updated_at
       FROM product_attributes 
       WHERE product_id = ? 
       ORDER BY attribute_name`,
      [productId]
    );

    // Transformar os valores JSON
    const formattedAttributes = attributes.map((attr: any) => ({
      id: attr.attribute_id,
      name: attr.attribute_name,
      values: JSON.parse(attr.attribute_values),
      createdAt: attr.created_at,
      updatedAt: attr.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        productId: parseInt(productId),
        attributes: formattedAttributes,
        total: formattedAttributes.length
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar atributos do produto:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productId, attributes } = await request.json();

    if (!productId || !attributes || !Array.isArray(attributes)) {
      return NextResponse.json({
        success: false,
        message: 'productId e attributes são obrigatórios'
      }, { status: 400 });
    }

    // Verificar se o produto existe
    const productExists = await executeQuery(
      'SELECT id FROM products_vtex WHERE id = ?',
      [productId]
    );

    if (!productExists || productExists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    // Limpar atributos existentes
    await executeQuery(
      'DELETE FROM product_attributes WHERE product_id = ?',
      [productId]
    );

    // Inserir novos atributos (desconsiderando "Seller" e "Categoria")
    let importedCount = 0;
    for (const attribute of attributes) {
      if (attribute.id && attribute.name && attribute.values) {
        // Desconsiderar atributos específicos
        if (EXCLUDED_ATTRIBUTES.includes(attribute.name)) {
          console.log(`⏭️ Atributo "${attribute.name}" desconsiderado para produto ${productId}`);
          continue;
        }

        await executeQuery(
          `INSERT INTO product_attributes (product_id, attribute_id, attribute_name, attribute_values, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [
            productId,
            attribute.id,
            attribute.name,
            JSON.stringify(attribute.values)
          ]
        );
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} atributos importados com sucesso`,
      data: {
        productId,
        importedCount,
        totalAttributes: attributes.length
      }
    });

  } catch (error: any) {
    console.error('Erro ao importar atributos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

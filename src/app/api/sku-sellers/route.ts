import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const skuId = searchParams.get('skuId');

    let query = `
      SELECT 
        m.id,
        m.product_id,
        m.title,
        m.description,
        m.seller_sku,
        m.clothing_type,
        m.sleeve_type,
        m.gender,
        m.color,
        m.modelo,
        m.wedge_shape,
        m.is_sportive,
        m.main_color,
        m.item_condition,
        m.brand,
        m.is_active,
        m.created_at,
        m.updated_at,
        p.name as product_name,
        p.ref_id as product_ref_id
      FROM meli m
      LEFT JOIN products_vtex p ON m.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (productId) {
      query += ` AND m.product_id = ?`;
      params.push(productId);
    }

    if (skuId) {
      query += ` AND m.seller_sku = (SELECT ref_id FROM products_vtex WHERE id = ?)`;
      params.push(skuId);
    }

    query += ` ORDER BY m.created_at DESC`;

    const skuSellers = await executeQuery(query, params);

    console.log(`✅ Encontrados ${skuSellers.length} registros de SKU Sellers`);

    return NextResponse.json({
      success: true,
      message: `${skuSellers.length} registros de SKU Sellers encontrados`,
      data: {
        skuSellers,
        total: skuSellers.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKU Sellers:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      product_id,
      title,
      description,
      seller_sku,
      clothing_type,
      sleeve_type,
      gender,
      color,
      modelo,
      wedge_shape,
      is_sportive,
      main_color,
      item_condition,
      brand
    } = await request.json();

    if (!product_id || !title || !description) {
      return NextResponse.json({
        success: false,
        message: 'product_id, title e description são obrigatórios'
      }, { status: 400 });
    }

    const query = `
      INSERT INTO meli (
        product_id, title, description, seller_sku, clothing_type, 
        sleeve_type, gender, color, modelo, wedge_shape, is_sportive, 
        main_color, item_condition, brand, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const params = [
      product_id, title, description, seller_sku, clothing_type,
      sleeve_type, gender, color, modelo, wedge_shape, is_sportive,
      main_color, item_condition, brand
    ];

    const [result] = await executeQuery(query, params);

    console.log(`✅ SKU Seller criado com ID: ${result.insertId}`);

    return NextResponse.json({
      success: true,
      message: 'SKU Seller criado com sucesso',
      data: {
        id: result.insertId,
        product_id,
        seller_sku
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar SKU Seller:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

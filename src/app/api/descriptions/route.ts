import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status') || 'generated';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        d.*,
        p.name as product_name,
        p.ref_id as product_ref_id,
        b.name as brand_name,
        c.name as category_name
      FROM descriptions d
      LEFT JOIN products_vtex p ON d.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (productId) {
      query += ` AND d.product_id = ?`;
      params.push(parseInt(productId));
    }

    if (status) {
      query += ` AND d.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY d.created_at DESC`;

    if (limit > 0) {
      query += ` LIMIT ${limit}`;
    }
    if (offset > 0) {
      query += ` OFFSET ${offset}`;
    }

    console.log('🔍 Buscando descrições:', { productId, status, limit, offset });
    
    const descriptions = await executeQuery(query, params);
    
    // Processar FAQ se existir
    const processedDescriptions = descriptions.map((desc: any) => ({
      ...desc,
      faq: desc.faq ? JSON.parse(desc.faq) : []
    }));

    console.log(`✅ Encontradas ${processedDescriptions.length} descrições`);

    return NextResponse.json({
      success: true,
      data: processedDescriptions,
      pagination: {
        total: processedDescriptions.length,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar descrições:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productId, title, description, faq, status = 'generated' } = await request.json();

    if (!productId || !title || !description) {
      return NextResponse.json({ 
        success: false, 
        message: 'productId, title e description são obrigatórios' 
      }, { status: 400 });
    }

    const faqJson = faq ? JSON.stringify(faq) : null;

    const query = `
      INSERT INTO descriptions (product_id, title, description, faq, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [productId, title, description, faqJson, status]);

    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId }
    });

  } catch (error) {
    console.error('❌ Erro ao criar descrição:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, description, faq, status } = await request.json();

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID é obrigatório' 
      }, { status: 400 });
    }

    const faqJson = faq ? JSON.stringify(faq) : null;

    const query = `
      UPDATE descriptions 
      SET title = ?, description = ?, faq = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [title, description, faqJson, status, id]);

    return NextResponse.json({
      success: true,
      message: 'Descrição atualizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar descrição:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID é obrigatório' 
      }, { status: 400 });
    }

    const query = `DELETE FROM descriptions WHERE id = ?`;
    await executeQuery(query, [id]);

    return NextResponse.json({
      success: true,
      message: 'Descrição removida com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao remover descrição:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

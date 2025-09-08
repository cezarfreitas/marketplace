import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (productId) {
      // Buscar descrição específica de um produto
      const query = `
        SELECT 
          m.*,
          p.name as product_name,
          p.ref_id as product_ref_id
        FROM meli m
        JOIN products p ON m.product_id = p.id
        WHERE m.product_id = ?
        ORDER BY m.created_at DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [productId]);
      
      return NextResponse.json({
        success: true,
        data: results.length > 0 ? results[0] : null
      });
    } else {
      // Buscar todas as descrições
      const query = `
        SELECT 
          m.*,
          p.name as product_name,
          p.ref_id as product_ref_id
        FROM meli m
        JOIN products p ON m.product_id = p.id
        ORDER BY m.created_at DESC
      `;

      const results = await executeQuery(query, []);
      
      return NextResponse.json({
        success: true,
        data: results
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao buscar descrições do Marketplace:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar descrições',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      productId, 
      title, 
      description, 
      clothing_type,
      sleeve_type,
      gender,
      color,
      modelo,
      seller_sku,
      wedge_shape,
      is_sportive,
      main_color,
      item_condition,
      brand,
      agentUsed,
      modelUsed,
      tokensUsed
    } = body;

    if (!productId || !title || !description) {
      return NextResponse.json({
        success: false,
        message: 'productId, title e description são obrigatórios'
      }, { status: 400 });
    }

    // Verificar se a tabela meli existe, se não, criar
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS meli (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        clothing_type VARCHAR(100),
        sleeve_type VARCHAR(50),
        gender VARCHAR(50),
        color VARCHAR(100),
        modelo TEXT,
        seller_sku VARCHAR(255),
        wedge_shape VARCHAR(50),
        is_sportive VARCHAR(10),
        main_color VARCHAR(100),
        item_condition VARCHAR(50),
        brand VARCHAR(255),
        agent_used VARCHAR(100),
        model_used VARCHAR(100),
        tokens_used INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_meli (product_id)
      )
    `;

    await executeQuery(createTableQuery, []);

    // Inserir ou atualizar descrição
    const insertQuery = `
      INSERT INTO meli (
        product_id, title, description, clothing_type, sleeve_type, gender, color, modelo,
        seller_sku, wedge_shape, is_sportive, main_color, item_condition, brand,
        agent_used, model_used, tokens_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        clothing_type = VALUES(clothing_type),
        sleeve_type = VALUES(sleeve_type),
        gender = VALUES(gender),
        color = VALUES(color),
        modelo = VALUES(modelo),
        seller_sku = VALUES(seller_sku),
        wedge_shape = VALUES(wedge_shape),
        is_sportive = VALUES(is_sportive),
        main_color = VALUES(main_color),
        item_condition = VALUES(item_condition),
        brand = VALUES(brand),
        agent_used = VALUES(agent_used),
        model_used = VALUES(model_used),
        tokens_used = VALUES(tokens_used),
        updated_at = CURRENT_TIMESTAMP,
        created_at = CASE 
          WHEN created_at IS NULL THEN CURRENT_TIMESTAMP 
          ELSE created_at 
        END
    `;

    const result = await executeQuery(insertQuery, [
      productId,
      title,
      description,
      clothing_type || null,
      sleeve_type || null,
      gender || null,
      color || null,
      modelo || null,
      seller_sku || null,
      wedge_shape || null,
      is_sportive || null,
      main_color || null,
      item_condition || null,
      brand || null,
      agentUsed || null,
      modelUsed || null,
      tokensUsed || 0
    ]);

    console.log('✅ Descrição do Marketplace salva para produto ID:', productId);

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        productId,
        title,
        description
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao salvar descrição do Marketplace:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao salvar descrição',
      error: error.message
    }, { status: 500 });
  }
}

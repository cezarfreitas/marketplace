import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-simple';
import { vtexService } from '@/lib/vtex-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando importação simplificada...');
    
    const body = await request.json();
    const { refId } = body;
    
    if (!refId) {
      return NextResponse.json({
        success: false,
        message: 'RefId é obrigatório'
      }, { status: 400 });
    }

    console.log(`📡 Buscando produto RefId ${refId}...`);
    const product = await vtexService.getProductByRefId(refId);
    console.log(`✅ Produto encontrado:`, product.Name);

    console.log(`📦 Inserindo produto...`);
    const [productResult] = await executeQuery(
      `INSERT INTO products (vtex_id, name, department_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [
        product.Id,
        product.Name,
        product.DepartmentId,
        product.RefId,
        product.IsVisible,
        product.Description,
        product.Title,
        product.IsActive
      ]
    );
    console.log(`✅ Produto inserido:`, productResult);

    return NextResponse.json({
      success: true,
      message: `Produto ${refId} importado com sucesso!`,
      data: {
        product: product,
        insertResult: productResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na importação simplificada:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na importação simplificada',
      error: error.message
    }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-simple';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando apenas inserção no banco...');
    
    // Dados de teste simples
    const testProduct = {
      Id: 999999,
      Name: "Produto Teste",
      DepartmentId: 1,
      RefId: "TESTE123",
      IsVisible: true,
      Description: "Descrição teste",
      Title: "Título teste",
      IsActive: true
    };

    console.log(`📦 Inserindo produto teste...`);
    const [productResult] = await executeQuery(
      `INSERT INTO products (vtex_id, name, department_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [
        testProduct.Id,
        testProduct.Name,
        testProduct.DepartmentId,
        testProduct.RefId,
        testProduct.IsVisible,
        testProduct.Description,
        testProduct.Title,
        testProduct.IsActive
      ]
    );
    console.log(`✅ Produto inserido:`, productResult);

    return NextResponse.json({
      success: true,
      message: `Produto teste inserido com sucesso!`,
      data: {
        insertResult: productResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na inserção:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na inserção',
      error: error.message
    }, { status: 400 });
  }
}

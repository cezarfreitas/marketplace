import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🧪 Inserindo registro de teste na tabela descriptions...');

    // Buscar um produto existente para testar
    const [products] = await executeQuery('SELECT id, name FROM products_vtex LIMIT 1');
    
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum produto encontrado para testar'
      }, { status: 404 });
    }

    const testProduct = products[0];
    console.log(`📦 Produto para teste: ${testProduct.id} - ${testProduct.name}`);

    // Verificar se a tabela descriptions existe
    try {
      await executeQuery('SELECT 1 FROM descriptions LIMIT 1');
    } catch (error) {
      console.log('📋 Tabela descriptions não existe, criando...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS descriptions (
          id_product_vtex INT PRIMARY KEY,
          description TEXT NOT NULL,
          openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
          openai_tokens_used INT DEFAULT 0,
          openai_tokens_prompt INT DEFAULT 0,
          openai_tokens_completion INT DEFAULT 0,
          openai_temperature DECIMAL(3,2) DEFAULT 0.30,
          openai_max_tokens INT DEFAULT 100,
          openai_response_time_ms INT DEFAULT 0,
          openai_cost DECIMAL(10,6) DEFAULT 0.000000,
          openai_request_id VARCHAR(255),
          generation_duration_ms INT DEFAULT 0,
          status ENUM('pending', 'generated', 'error') DEFAULT 'generated',
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await executeQuery(createTableSQL);
      console.log('✅ Tabela descriptions criada');
    }

    // Inserir registro de teste
    const insertQuery = `
      INSERT INTO descriptions (
        id_product_vtex, 
        description, 
        status,
        created_at
      ) VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
      description = VALUES(description),
      status = VALUES(status),
      updated_at = NOW()
    `;

    const [insertResult] = await executeQuery(insertQuery, [
      testProduct.id,
      'Descrição de teste para verificar se o botão "D" fica colorido. Esta é uma descrição gerada automaticamente para fins de teste.',
      'generated'
    ]);

    console.log('✅ Registro de teste inserido:', insertResult);

    // Verificar se foi inserido
    const [checkResult] = await executeQuery(
      'SELECT * FROM descriptions WHERE id_product_vtex = ?',
      [testProduct.id]
    );

    console.log('📊 Verificação:', checkResult.length > 0 ? 'Registro encontrado' : 'Registro não encontrado');

    return NextResponse.json({
      success: true,
      message: 'Registro de teste inserido com sucesso',
      data: {
        productId: testProduct.id,
        productName: testProduct.name,
        recordFound: checkResult.length > 0
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao inserir registro de teste:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao inserir registro de teste',
      error: error.message
    }, { status: 500 });
  }
}

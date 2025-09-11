import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeModificationQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔧 Corrigindo chaves únicas da tabela anymarket...');

    // Remover todas as chaves únicas existentes (exceto PRIMARY)
    const dropQueries = [
      'ALTER TABLE anymarket DROP INDEX IF EXISTS unique_produto_any',
      'ALTER TABLE anymarket DROP INDEX IF EXISTS unique_caracteristica_produto', 
      'ALTER TABLE anymarket DROP INDEX IF EXISTS unique_vtex_any',
      'ALTER TABLE anymarket DROP INDEX IF EXISTS unique_anymarket_vtex'
    ];

    for (const query of dropQueries) {
      try {
        await executeModificationQuery(query);
        console.log(`✅ Executado: ${query}`);
      } catch (error: any) {
        // Ignorar erros de índice não existente
        if (!error.message.includes("doesn't exist")) {
          console.log(`⚠️ Aviso: ${error.message}`);
        }
      }
    }

    // Adicionar apenas a chave única para id_produto_any
    try {
      await executeModificationQuery('ALTER TABLE anymarket ADD UNIQUE KEY unique_produto_any (id_produto_any)');
      console.log('✅ Chave única unique_produto_any adicionada');
    } catch (error: any) {
      if (error.message.includes("Duplicate key name")) {
        console.log('ℹ️ Chave única unique_produto_any já existe');
      } else {
        throw error;
      }
    }

    // Verificar estrutura final
    const structure = await executeModificationQuery('DESCRIBE anymarket');
    const indexes = await executeModificationQuery('SHOW INDEX FROM anymarket');

    console.log('✅ Tabela anymarket corrigida com sucesso!');

    return NextResponse.json({
      success: true,
      message: 'Chaves únicas da tabela anymarket corrigidas com sucesso!',
      data: {
        structure,
        indexes
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao corrigir tabela anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao corrigir tabela',
      error: error.message
    }, { status: 500 });
  }
}

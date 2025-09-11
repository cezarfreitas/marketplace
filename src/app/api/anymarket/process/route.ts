import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeModificationQuery } from '@/lib/database';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('📤 Processando arquivo com mapeamento personalizado...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const idAnyColumn = formData.get('idAnyColumn') as string;
    const vtexIdColumn = formData.get('refIdColumn') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      }, { status: 400 });
    }

    if (!idAnyColumn || !vtexIdColumn) {
      return NextResponse.json({
        success: false,
        message: 'Mapeamento de colunas é obrigatório'
      }, { status: 400 });
    }

    console.log('📁 Processando arquivo:', file.name);
    console.log('🗺️ Mapeamento - ID_PRODUTO_ANY:', idAnyColumn, 'ID_PRODUTO_VTEX:', vtexIdColumn);

    // Ler arquivo
    const buffer = await file.arrayBuffer();
    let headers: string[];
    let rows: any[][];
    
    try {
      if (file.type === 'text/csv' || file.type === 'application/csv') {
        // Para arquivos CSV
        const text = new TextDecoder().decode(buffer);
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          return NextResponse.json({
            success: false,
            message: 'Arquivo deve ter pelo menos um cabeçalho e uma linha de dados'
          }, { status: 400 });
        }

        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
      } else {
        // Para arquivos Excel
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          return NextResponse.json({
            success: false,
            message: 'Arquivo deve ter pelo menos um cabeçalho e uma linha de dados'
          }, { status: 400 });
        }

        headers = jsonData[0] as string[];
        rows = (jsonData.slice(1) as any[][]);
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do arquivo:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao processar arquivo. Verifique se o formato está correto.'
      }, { status: 400 });
    }

    // Encontrar índices das colunas mapeadas
    const idAnyIndex = headers.findIndex(h => h === idAnyColumn);
    const vtexIdIndex = headers.findIndex(h => h === vtexIdColumn);

    if (idAnyIndex === -1 || vtexIdIndex === -1) {
      return NextResponse.json({
        success: false,
        message: `Colunas mapeadas não encontradas. ID_PRODUTO_ANY: "${idAnyColumn}", ID_PRODUTO_VTEX: "${vtexIdColumn}"`
      }, { status: 400 });
    }

    console.log(`📊 Processando ${rows.length} linhas...`);
    let processed = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idAny = row[idAnyIndex];
      const vtexId = row[vtexIdIndex];

      // Validar dados
      if (!idAny || !vtexId) {
        errors++;
        errorDetails.push(`Linha ${i + 2}: Dados vazios (ID_PRODUTO_ANY: "${idAny}", ID_PRODUTO_VTEX: "${vtexId}")`);
        continue;
      }

      // Limpar dados
      const cleanIdAny = String(idAny).trim();
      const cleanVtexId = String(vtexId).trim();

      if (!cleanIdAny || !cleanVtexId) {
        errors++;
        errorDetails.push(`Linha ${i + 2}: Dados inválidos após limpeza`);
        continue;
      }

      try {
        // Inserir ou atualizar registro na tabela anymarket
        await executeModificationQuery(`
          INSERT INTO anymarket (id_produto_any, ref_vtex)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            ref_vtex = VALUES(ref_vtex),
            updated_at = CURRENT_TIMESTAMP
        `, [cleanIdAny, cleanVtexId]);

        processed++;
      } catch (insertError: any) {
        console.error('❌ Erro ao inserir:', insertError);
        errors++;
        errorDetails.push(`Linha ${i + 2}: ${insertError.message}`);
      }
    }

    console.log(`✅ Processamento concluído - Processados: ${processed}, Erros: ${errors}`);

    return NextResponse.json({
      success: true,
      message: `Arquivo processado com sucesso!`,
      data: {
        processed,
        errors,
        totalRows: rows.length,
        errorDetails: errorDetails.slice(0, 10), // Limitar a 10 erros para não sobrecarregar
        mapping: {
          idAnyColumn,
          vtexIdColumn
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no processamento do arquivo:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao processar arquivo',
      error: error.message
    }, { status: 500 });
  }
}

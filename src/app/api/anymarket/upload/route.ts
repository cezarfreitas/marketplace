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

    console.log('📤 Iniciando upload de arquivo Excel/CSV...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      }, { status: 400 });
    }

    console.log('📁 Arquivo recebido:', file.name, 'Tamanho:', file.size);

    // Verificar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        message: 'Tipo de arquivo não suportado. Use .xlsx, .xls ou .csv'
      }, { status: 400 });
    }

    // Ler arquivo
    const buffer = await file.arrayBuffer();
    let workbook;
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
        workbook = XLSX.read(buffer, { type: 'array' });
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
        rows = jsonData.slice(1) as any[][];
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do arquivo:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao processar arquivo. Verifique se o formato está correto.'
      }, { status: 400 });
    }

    console.log('📋 Cabeçalhos encontrados:', headers);

    // Encontrar índices das colunas necessárias
    const idAnyIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('id_produto_any') || 
           h.toLowerCase().includes('id_any') || 
           h.toLowerCase().includes('idany') ||
           h.toLowerCase().includes('id any'))
    );
    
    const vtexIdIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('ref_produto_vtex') || 
           h.toLowerCase().includes('ref_id') || 
           h.toLowerCase().includes('refid') ||
           h.toLowerCase().includes('ref id') ||
           h.toLowerCase().includes('vtex'))
    );

    if (idAnyIndex === -1 || vtexIdIndex === -1) {
      return NextResponse.json({
        success: false,
        message: `Colunas obrigatórias não encontradas. Esperado: ID_PRODUTO_ANY e REF_VTEX. Encontrado: ${headers.join(', ')}`
      }, { status: 400 });
    }

    console.log(`📊 Colunas encontradas - ID_PRODUTO_ANY: ${idAnyIndex}, REF_VTEX: ${vtexIdIndex}`);
    console.log(`📊 Processando ${rows.length} linhas em lotes de 300...`);
    let processed = 0;
    let errors = 0;
    const BATCH_SIZE = 300;

    // Processar em lotes de 300 linhas
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
      const batch = rows.slice(batchStart, batchEnd);
      
      console.log(`🔄 Processando lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: linhas ${batchStart + 1} a ${batchEnd}`);
      
      // Pequeno delay entre lotes para evitar sobrecarga do banco
      if (batchStart > 0) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      }

      // Preparar dados válidos do lote
      const validBatchData: Array<{idAny: string, vtexId: string, originalIndex: number}> = [];
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const idAny = row[idAnyIndex];
        const vtexId = row[vtexIdIndex];
        const originalIndex = batchStart + i;

        // Validar dados
        if (!idAny || !vtexId) {
          errors++;
          continue;
        }

        // Limpar dados
        const cleanIdAny = String(idAny).trim();
        const cleanVtexId = String(vtexId).trim();

        if (!cleanIdAny || !cleanVtexId) {
          errors++;
          continue;
        }

        validBatchData.push({
          idAny: cleanIdAny,
          vtexId: cleanVtexId,
          originalIndex
        });
      }

      // Se há dados válidos no lote, inserir em batch
      if (validBatchData.length > 0) {
        try {
          // Construir query de INSERT múltiplo
          const values = validBatchData.map(() => '(?, ?)').join(', ');
          const params: string[] = [];
          
          validBatchData.forEach(item => {
            params.push(item.idAny, item.vtexId);
          });

          await executeModificationQuery(`
            INSERT INTO anymarket (id_produto_any, ref_produto_vtex)
            VALUES ${values}
            ON DUPLICATE KEY UPDATE
              ref_produto_vtex = CASE 
                WHEN ref_produto_vtex != VALUES(ref_produto_vtex) THEN VALUES(ref_produto_vtex)
                ELSE ref_produto_vtex
              END,
              updated_at = CURRENT_TIMESTAMP
          `, params);

          processed += validBatchData.length;
          console.log(`✅ Lote processado: ${validBatchData.length} registros inseridos/atualizados`);
          
        } catch (batchError: any) {
          console.error('❌ Erro ao processar lote:', batchError);
          
          // Se o batch falhou, tentar inserir individualmente
          console.log('🔄 Tentando inserção individual para o lote...');
          for (const item of validBatchData) {
            try {
              await executeModificationQuery(`
                INSERT INTO anymarket (id_produto_any, ref_produto_vtex)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                  ref_produto_vtex = CASE 
                    WHEN ref_produto_vtex != VALUES(ref_produto_vtex) THEN VALUES(ref_produto_vtex)
                    ELSE ref_produto_vtex
                  END,
                  updated_at = CURRENT_TIMESTAMP
              `, [item.idAny, item.vtexId]);
              
              processed++;
            } catch (individualError: any) {
              console.error('❌ Erro ao inserir individualmente:', individualError);
              errors++;
            }
          }
        }
      }
    }

    console.log(`✅ Upload concluído - Processados: ${processed}, Erros: ${errors}`);

    return NextResponse.json({
      success: true,
      message: `Arquivo processado com sucesso!`,
      processed,
      errors
    });

  } catch (error: any) {
    console.error('❌ Erro no upload do arquivo:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao processar arquivo',
      error: error.message
    }, { status: 500 });
  }
}
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

    console.log(`📊 Processando ${rows.length} linhas em lotes de 300...`);
    let processed = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const BATCH_SIZE = 300;

    // Processar em lotes de 300 linhas
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      try {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batch = rows.slice(batchStart, batchEnd);
        const currentBatch = Math.floor(batchStart / BATCH_SIZE) + 1;
        
        console.log(`🔄 Processando lote ${currentBatch}: linhas ${batchStart + 1} a ${batchEnd}`);
        
        // Verificar memória a cada 10 lotes
        if (currentBatch % 10 === 0) {
          const memUsage = process.memoryUsage();
          console.log(`📊 Memória - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }
        
        // Pequeno delay entre lotes para evitar sobrecarga do banco
        if (batchStart > 0) {
          console.log(`⏳ Aguardando 50ms antes do próximo lote...`);
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
          errorDetails.push(`Linha ${originalIndex + 2}: Dados vazios (ID_PRODUTO_ANY: "${idAny}", ID_PRODUTO_VTEX: "${vtexId}")`);
          continue;
        }

        // Limpar dados
        const cleanIdAny = String(idAny).trim();
        const cleanVtexId = String(vtexId).trim();

        if (!cleanIdAny || !cleanVtexId) {
          errors++;
          errorDetails.push(`Linha ${originalIndex + 2}: Dados inválidos após limpeza`);
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
        console.log(`📝 Preparando inserção de ${validBatchData.length} registros...`);
        try {
          // Construir query de INSERT múltiplo
          const values = validBatchData.map(() => '(?, ?)').join(', ');
          const params: string[] = [];
          
          validBatchData.forEach(item => {
            params.push(item.idAny, item.vtexId);
          });

          console.log(`💾 Executando INSERT para lote ${Math.floor(batchStart / BATCH_SIZE) + 1}...`);

          // Adicionar timeout para a operação
          const batchPromise = executeModificationQuery(`
            INSERT INTO anymarket (id_produto_any, ref_produto_vtex)
            VALUES ${values}
            ON DUPLICATE KEY UPDATE
              ref_produto_vtex = CASE 
                WHEN ref_produto_vtex != VALUES(ref_produto_vtex) THEN VALUES(ref_produto_vtex)
                ELSE ref_produto_vtex
              END,
              updated_at = CURRENT_TIMESTAMP
          `, params);

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na operação de batch')), 30000) // 30s timeout
          );

          const result = await Promise.race([batchPromise, timeoutPromise]);
          
          // Verificar quantos registros foram realmente afetados       
          const affectedRows = (result as any)?.affectedRows || 0;
          const changedRows = (result as any)?.changedRows || 0;
          const insertedRows = affectedRows - changedRows;
          
          // Contar registros processados (inseridos + atualizados)
          const actuallyProcessed = affectedRows;
          processed += actuallyProcessed;
          
          console.log(`✅ Lote ${Math.floor(batchStart / BATCH_SIZE) + 1} processado: ${validBatchData.length} registros enviados`);
          console.log(`📊 Resultado DB - Afetados: ${affectedRows}, Inseridos: ${insertedRows}, Atualizados: ${changedRows}`);
          
        } catch (batchError: any) {
          console.error(`❌ Erro ao processar lote ${Math.floor(batchStart / BATCH_SIZE) + 1}:`, batchError);
          
          // Se o batch falhou, tentar inserir individualmente
          console.log(`🔄 Tentando inserção individual para o lote ${Math.floor(batchStart / BATCH_SIZE) + 1}...`);
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
              errors++;
              errorDetails.push(`Linha ${item.originalIndex + 2}: ${individualError.message}`);
            }
          }
        }
      } else {
        console.log(`⚠️ Lote ${Math.floor(batchStart / BATCH_SIZE) + 1} não possui dados válidos`);
      }
      
      } catch (batchError: any) {
        console.error(`❌ Erro crítico no lote ${Math.floor(batchStart / BATCH_SIZE) + 1}:`, batchError);
        console.error(`📍 Linha do erro: ${batchStart + 1} a ${Math.min(batchStart + BATCH_SIZE, rows.length)}`);
        
        // Continuar com o próximo lote em caso de erro
        errors++;
        errorDetails.push(`Lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batchError.message}`);
        continue;
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

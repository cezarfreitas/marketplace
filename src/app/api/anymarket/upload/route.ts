import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';
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
      h && (h.toLowerCase().includes('id_any') || 
           h.toLowerCase().includes('idany') ||
           h.toLowerCase().includes('id any'))
    );
    
    const refIdIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('ref_id') || 
           h.toLowerCase().includes('refid') ||
           h.toLowerCase().includes('ref id'))
    );

    if (idAnyIndex === -1 || refIdIndex === -1) {
      return NextResponse.json({
        success: false,
        message: `Colunas obrigatórias não encontradas. Esperado: ID_ANY e REF_ID. Encontrado: ${headers.join(', ')}`
      }, { status: 400 });
    }

    console.log(`📊 Colunas encontradas - ID_ANY: ${idAnyIndex}, REF_ID: ${refIdIndex}`);
    let processed = 0;
    let errors = 0;

    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idAny = row[idAnyIndex];
      const refId = row[refIdIndex];

      // Validar dados
      if (!idAny || !refId) {
        errors++;
        continue;
      }

      // Limpar dados
      const cleanIdAny = String(idAny).trim();
      const cleanRefId = String(refId).trim();

      if (!cleanIdAny || !cleanRefId) {
        errors++;
        continue;
      }

      try {
        // Inserir ou atualizar registro
        await executeQuery(`
          INSERT INTO anymarket (id_any, ref_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            ref_id = VALUES(ref_id),
            updated_at = CURRENT_TIMESTAMP
        `, [cleanIdAny, cleanRefId]);

        processed++;
      } catch (insertError: any) {
        console.error('❌ Erro ao inserir:', insertError);
        errors++;
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
import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('📤 Analisando arquivo para mapeamento dinâmico...');
    
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
    let headers: string[];
    let sampleRows: any[][];
    
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
        sampleRows = lines.slice(1, 6).map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
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
        sampleRows = (jsonData.slice(1, 6) as any[][]);
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do arquivo:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao processar arquivo. Verifique se o formato está correto.'
      }, { status: 400 });
    }

    console.log('📋 Cabeçalhos encontrados:', headers);

    // Detectar automaticamente colunas que podem ser ID_ANY e REF_ID
    const columnSuggestions = headers.map((header, index) => {
      const lowerHeader = header.toLowerCase();
      
      // Sugestões para ID_ANY
      const idAnyScore = [
        lowerHeader.includes('id_any'),
        lowerHeader.includes('idany'),
        lowerHeader.includes('id any'),
        lowerHeader.includes('anymarket'),
        lowerHeader.includes('any_id'),
        lowerHeader.includes('external_id'),
        lowerHeader.includes('sku_any'),
        lowerHeader === 'id',
        lowerHeader.includes('codigo'),
        lowerHeader.includes('código')
      ].filter(Boolean).length;

      // Sugestões para REF_ID
      const refIdScore = [
        lowerHeader.includes('ref_id'),
        lowerHeader.includes('refid'),
        lowerHeader.includes('ref id'),
        lowerHeader.includes('reference'),
        lowerHeader.includes('vtex'),
        lowerHeader.includes('vtex_id'),
        lowerHeader.includes('product_id'),
        lowerHeader.includes('produto'),
        lowerHeader.includes('referencia')
      ].filter(Boolean).length;

      return {
        index,
        header,
        idAnyScore,
        refIdScore,
        isIdAnyCandidate: idAnyScore > 0,
        isRefIdCandidate: refIdScore > 0
      };
    });

    // Encontrar melhor sugestão para cada campo
    const bestIdAny = columnSuggestions.reduce((best, current) => 
      current.idAnyScore > best.idAnyScore ? current : best
    );
    
    const bestRefId = columnSuggestions.reduce((best, current) => 
      current.refIdScore > best.refIdScore ? current : best
    );

    // Preparar dados de exemplo para preview
    const previewData = sampleRows.map((row, rowIndex) => {
      const rowData: any = { rowIndex: rowIndex + 1 };
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex] || '';
      });
      return rowData;
    });

    return NextResponse.json({
      success: true,
      data: {
        headers,
        totalColumns: headers.length,
        totalRows: sampleRows.length + 1, // +1 para o cabeçalho
        columnSuggestions,
        autoMapping: {
          idAny: bestIdAny.idAnyScore > 0 ? bestIdAny.index : null,
          refId: bestRefId.refIdScore > 0 ? bestRefId.index : null
        },
        previewData,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao analisar arquivo:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao analisar arquivo',
      error: error.message
    }, { status: 500 });
  }
}

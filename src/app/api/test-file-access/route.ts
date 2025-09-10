import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { access, readdir } from 'fs/promises';
import { getBaseUrl } from '@/lib/url-utils';

export async function GET(request: NextRequest) {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'crop-images');
    
    // Verificar se o diretório existe
    try {
      await access(uploadDir);
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Diretório de uploads não existe',
        error: error
      }, { status: 404 });
    }

    // Listar arquivos no diretório
    const files = await readdir(uploadDir);
    
    // Gerar URLs para os arquivos
    const baseUrl = getBaseUrl(request);
    const fileUrls = files.map(file => ({
      fileName: file,
      url: `${baseUrl}/uploads/crop-images/${file}`,
      localPath: join(uploadDir, file)
    }));

    // Testar acesso a alguns arquivos
    const testResults = [];
    for (const fileUrl of fileUrls.slice(0, 3)) { // Testar apenas os primeiros 3
      try {
        const response = await fetch(fileUrl.url, { method: 'HEAD' });
        testResults.push({
          fileName: fileUrl.fileName,
          url: fileUrl.url,
          accessible: response.ok,
          status: response.status,
          statusText: response.statusText
        });
      } catch (error: any) {
        testResults.push({
          fileName: fileUrl.fileName,
          url: fileUrl.url,
          accessible: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Teste de acesso a arquivos concluído',
      data: {
        uploadDir,
        baseUrl,
        totalFiles: files.length,
        files: fileUrls,
        testResults
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de acesso a arquivos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao testar acesso a arquivos',
      error: error.message
    }, { status: 500 });
  }
}

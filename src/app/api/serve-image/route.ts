import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    let fileName = searchParams.get('file');
    
    // Se não há parâmetro file, tentar extrair do path
    if (!fileName) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      fileName = pathParts[pathParts.length - 1];
    }
    
    if (!fileName) {
      return NextResponse.json({
        success: false,
        message: 'Nome do arquivo não encontrado'
      }, { status: 400 });
    }

    // Construir o caminho do arquivo
    const filePath = join(process.cwd(), 'public', 'uploads', 'crop-images', fileName);
    
    console.log('🔍 Tentando servir arquivo:', filePath);
    
    // Verificar se o arquivo existe
    try {
      await access(filePath);
    } catch (error) {
      console.log('❌ Arquivo não encontrado:', filePath);
      return NextResponse.json({
        success: false,
        message: 'Arquivo não encontrado',
        filePath: filePath
      }, { status: 404 });
    }

    // Ler o arquivo
    const fileBuffer = await readFile(filePath);
    
    console.log('✅ Arquivo encontrado e lido:', fileName, 'Tamanho:', fileBuffer.length);

    // Retornar a imagem
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': fileBuffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao servir imagem:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao servir imagem',
      error: error.message
    }, { status: 500 });
  }
}

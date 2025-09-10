import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { getBaseUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  try {
    const { imageData, fileName } = await request.json();

    if (!imageData || !fileName) {
      return NextResponse.json({
        success: false,
        message: 'imageData e fileName são obrigatórios'
      }, { status: 400 });
    }

    // Converter base64 para buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Criar diretório de uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'crop-images');
    await mkdir(uploadDir, { recursive: true });

    // Salvar arquivo
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, imageBuffer);

    // Verificar se o arquivo foi realmente salvo
    try {
      await access(filePath);
      console.log('✅ Arquivo verificado no sistema de arquivos:', filePath);
      
      // Verificar tamanho do arquivo
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      console.log('📊 Tamanho do arquivo salvo:', stats.size, 'bytes');
      
    } catch (error) {
      console.error('❌ Erro: Arquivo não foi salvo corretamente:', filePath);
      console.error('❌ Erro detalhado:', error);
      throw new Error('Falha ao salvar arquivo no sistema de arquivos');
    }

    // Gerar URL pública automaticamente
    const baseUrl = getBaseUrl(request);
    const publicUrl = `${baseUrl}/uploads/crop-images/${fileName}`;
    
    console.log('🔍 Debug URL:', {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      detectedBaseUrl: baseUrl,
      fileName,
      publicUrl,
      filePath,
      fileExists: true,
      host: request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto')
    });

    console.log('✅ Imagem salva e verificada:', filePath);
    console.log('📤 URL pública:', publicUrl);

    return NextResponse.json({
      success: true,
      message: 'Imagem salva com sucesso',
      data: {
        fileName,
        filePath,
        publicUrl,
        size: imageBuffer.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao salvar imagem:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao salvar imagem',
      error: error.message
    }, { status: 500 });
  }
}

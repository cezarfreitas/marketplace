import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

    // Gerar URL pública
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://b2b-seo.jzo3qo.easypanel.host';
    const publicUrl = `${baseUrl}/uploads/crop-images/${fileName}`;

    console.log('✅ Imagem salva:', filePath);
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

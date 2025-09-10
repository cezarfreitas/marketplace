import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access, stat } from 'fs/promises';
import { join } from 'path';
import { getBaseUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  try {
    const imageUrl = 'https://projetoinfluencer.vteximg.com.br/arquivos/ids/5287720/Viseira-HD-Aba-Curva-Preta_638358924397754864.jpg';
    const fileName = `test_viseira_${Date.now()}.jpg`;
    
    console.log('🎨 Iniciando teste isolado com Pixian.ai');
    console.log('📥 URL da imagem:', imageUrl);
    console.log('📁 Nome do arquivo:', fileName);

    // 1. Processar com Pixian.ai
    const pixianData = {
      image: { url: imageUrl },
      background: { color: "#FFFFFF" },
      result: {
        crop_to_foreground: true,
        target_size: "1500 1500",
        vertical_alignment: "middle",
        margin: "0px 150px 0px 150px"
      },
      output: { format: "jpeg", jpeg_quality: 90 }
    };

    console.log('📤 Enviando para Pixian.ai...');
    const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pixianData)
    });

    if (!pixianResponse.ok) {
      const errorText = await pixianResponse.text();
      throw new Error(`Erro no Pixian: ${pixianResponse.status} - ${errorText}`);
    }

    const croppedImageBuffer = await pixianResponse.arrayBuffer();
    console.log('✅ Imagem processada no Pixian.ai com sucesso');
    console.log('📊 Tamanho do buffer:', croppedImageBuffer.byteLength, 'bytes');

    // 2. Salvar no servidor local
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'crop-images');
    
    // Garantir que o diretório existe
    try {
      await access(uploadsDir);
    } catch {
      console.log('📁 Criando diretório:', uploadsDir);
      await mkdir(uploadsDir, { recursive: true });
    }

    const filePath = join(uploadsDir, fileName);
    const base64Data = Buffer.from(croppedImageBuffer).toString('base64');
    
    console.log('💾 Salvando arquivo:', filePath);
    await writeFile(filePath, Buffer.from(croppedImageBuffer));
    
    // 3. Verificar se o arquivo foi salvo
    const stats = await stat(filePath);
    console.log('✅ Arquivo salvo com sucesso');
    console.log('📊 Tamanho do arquivo:', stats.size, 'bytes');
    console.log('📅 Data de criação:', stats.birthtime);

    // 4. Gerar URL pública
    const baseUrl = getBaseUrl(request);
    const publicUrl = `${baseUrl}/uploads/crop-images/${fileName}`;
    
    console.log('🌐 URL pública gerada:', publicUrl);

    // 5. Testar acessibilidade (opcional)
    let httpAccessible = false;
    try {
      const testResponse = await fetch(publicUrl, { method: 'HEAD' });
      httpAccessible = testResponse.ok;
      console.log('🔍 Teste HTTP:', testResponse.ok ? '✅ Acessível' : '❌ Não acessível');
    } catch (error) {
      console.log('🔍 Teste HTTP: ❌ Erro:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Teste isolado concluído com sucesso!',
      data: {
        originalUrl: imageUrl,
        processedUrl: publicUrl,
        fileName: fileName,
        filePath: filePath,
        fileSize: stats.size,
        httpAccessible: httpAccessible,
        pixianPayload: pixianData,
        details: {
          pixianResponse: {
            status: pixianResponse.status,
            bufferSize: croppedImageBuffer.byteLength
          },
          fileSystem: {
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          },
          url: {
            baseUrl: baseUrl,
            publicUrl: publicUrl,
            accessible: httpAccessible
          }
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste isolado:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro no teste isolado',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

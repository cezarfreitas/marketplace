import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, fileName } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'imageUrl é obrigatório'
      }, { status: 400 });
    }

    console.log('🎨 Iniciando processamento com Pixian.ai:', imageUrl);

    // 1. Processar no Pixian.ai
    const pixianData = {
      image: {
        url: imageUrl
      },
      background: {
        color: "#FFFFFF"
      },
      result: {
        crop_to_foreground: true,
        target_size: "1500 1500",
        vertical_alignment: "middle",
        margin: "0px 150px 0px 150px"
      },
      output: {
        format: "jpeg",
        jpeg_quality: 90
      }
    };

    console.log('📤 Payload enviado ao Pixian.ai:', JSON.stringify(pixianData, null, 2));

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
      console.error('❌ Erro no Pixian.ai:', pixianResponse.status, errorText);
      throw new Error(`Erro no Pixian.ai: ${pixianResponse.status} - ${errorText}`);
    }

    const croppedImageBuffer = await pixianResponse.arrayBuffer();
    console.log('✅ Imagem processada no Pixian.ai com sucesso');

    // 2. Salvar imagem processada no servidor
    const finalFileName = fileName || `pixian_${Date.now()}.jpg`;
    const croppedImageBase64 = Buffer.from(croppedImageBuffer).toString('base64');
    
    // Fazer upload da imagem para o servidor
    const baseUrl = getBaseUrl(request);
    const uploadResponse = await fetch(`${baseUrl}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: `data:image/jpeg;base64,${croppedImageBase64}`,
        fileName: finalFileName
      })
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('❌ Erro no upload:', uploadError);
      throw new Error('Erro ao fazer upload da imagem para o servidor');
    }

    const uploadResult = await uploadResponse.json();
    const processedImageUrl = uploadResult.data.publicUrl;
    console.log('📤 Imagem salva no servidor:', processedImageUrl);

    // 3. Verificar se o arquivo pode ser acessado
    try {
      console.log('🔍 Verificando acessibilidade do arquivo:', processedImageUrl);
      const fileCheckResponse = await fetch(processedImageUrl, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Meli-Integration/1.0'
        }
      });
      
      if (!fileCheckResponse.ok) {
        throw new Error(`Arquivo não acessível: ${fileCheckResponse.status} - ${fileCheckResponse.statusText}`);
      }
      console.log('✅ Arquivo verificado e acessível:', processedImageUrl);
    } catch (fileError: any) {
      console.error('❌ Erro ao verificar arquivo:', fileError);
      throw new Error(`Arquivo não pode ser acessado: ${fileError.message}`);
    }

    // 4. Retornar resultado com URLs
    return NextResponse.json({
      success: true,
      message: 'Imagem processada com sucesso!',
      data: {
        originalUrl: imageUrl,
        processedUrl: processedImageUrl,
        fileName: finalFileName,
        pixianPayload: pixianData,
        requestDetails: {
          pixian: {
            endpoint: 'https://api.pixian.ai/api/v2/remove-background',
            method: 'POST',
            headers: {
              'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
              'Content-Type': 'application/json'
            },
            payload: pixianData,
            curlCommand: `curl -X POST "https://api.pixian.ai/api/v2/remove-background" \\
  -H "Authorization: Basic cHgnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(pixianData)}'`
          },
          upload: {
            endpoint: `${baseUrl}/api/upload-image`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            payload: {
              imageData: `data:image/jpeg;base64,${croppedImageBase64}`,
              fileName: finalFileName
            },
            curlCommand: `curl -X POST "${baseUrl}/api/upload-image" \\
  -H "Content-Type: application/json" \\
  -d '{"imageData":"data:image/jpeg;base64,${croppedImageBase64}","fileName":"${finalFileName}"}'`
          }
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno no processamento:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

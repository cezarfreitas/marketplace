import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, testParams } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'imageUrl é obrigatório'
      }, { status: 400 });
    }

    console.log('🧪 Teste Pixian.ai iniciado');
    console.log('📸 URL da imagem:', imageUrl);
    console.log('⚙️ Parâmetros de teste:', testParams);

    // Preparar dados para o Pixian.ai usando JSON (formato curl)
    const pixianData = {
      image: {
        url: imageUrl
      },
      background: {
        color: testParams?.['background.color'] || "#FFFFFF"
      },
      result: {
        crop_to_foreground: testParams?.['result.crop_to_foreground'] === 'true' || true,
        target_size: testParams?.['result.target_size'] || "1500 1500",
        vertical_alignment: testParams?.['result.vertical_alignment'] || "middle",
        margin: testParams?.['result.margin'] || "0px 150px 0px 150px"
      },
      output: {
        format: testParams?.['output.format'] || "jpeg",
        jpeg_quality: parseInt(testParams?.['output.jpeg_quality'] || "90")
      }
    };

    console.log('🚀 Enviando para Pixian.ai...');
    const startTime = Date.now();

    // Fazer requisição para o Pixian.ai
    const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pixianData)
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`⏱️ Tempo de processamento: ${processingTime}ms`);
    console.log(`📊 Status da resposta: ${pixianResponse.status}`);

    if (!pixianResponse.ok) {
      const errorText = await pixianResponse.text();
      console.error('❌ Erro no Pixian:', errorText);
      return NextResponse.json({
        success: false,
        message: `Erro no Pixian: ${pixianResponse.status}`,
        error: errorText,
        processingTime
      }, { status: pixianResponse.status });
    }

    const processedImageBuffer = await pixianResponse.arrayBuffer();
    const processedImageBase64 = Buffer.from(processedImageBuffer).toString('base64');
    
    console.log('✅ Imagem processada com sucesso!');
    console.log(`📏 Tamanho processado: ${processedImageBuffer.byteLength} bytes`);

    return NextResponse.json({
      success: true,
      message: 'Imagem processada com sucesso',
      data: {
        processedSize: processedImageBuffer.byteLength,
        processingTime,
        processedImage: `data:image/jpeg;base64,${processedImageBase64}`,
        parameters: pixianData
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste Pixian:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

// Endpoint GET para informações sobre o teste
export async function GET() {
  return NextResponse.json({
    message: 'API de teste do Pixian.ai',
    usage: {
      method: 'POST',
      body: {
        imageUrl: 'string (obrigatório) - URL da imagem para processar',
        testParams: 'object (opcional) - Parâmetros customizados para o Pixian'
      },
      example: {
        imageUrl: 'https://example.com/image.jpg',
        testParams: {
          'background.color': '#FFFFFF',
          'result.crop_to_foreground': 'true',
          'result.target_size': '1500 1500',
          'result.vertical_alignment': 'middle',
          'output.format': 'jpeg',
          'output.jpeg_quality': '90',
          'result.margin': '0px 150px 0px 150px'
        }
      }
    },
    defaultParams: {
      'background.color': '#FFFFFF',
      'result.crop_to_foreground': 'true',
      'result.target_size': '1500 1500',
      'result.vertical_alignment': 'middle',
      'output.format': 'jpeg',
      'output.jpeg_quality': '90',
      'result.margin': '0px 150px 0px 150px'
    }
  });
}

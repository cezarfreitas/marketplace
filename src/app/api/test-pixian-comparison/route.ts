import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'imageUrl é obrigatório'
      }, { status: 400 });
    }

    console.log('🧪 Teste de Comparação Pixian.ai iniciado');
    console.log('📸 URL da imagem:', imageUrl);

    const results = {
      urlMethod: null as any,
      base64Method: null as any,
      comparison: null as any
    };

    // Método 1: Usando image.url (como no curl original)
    console.log('🔄 Testando método URL...');
    try {
      const urlFormData = new URLSearchParams();
      urlFormData.append('image.url', `"${imageUrl}"`);
      urlFormData.append('background.color', '#FFFFFF');
      urlFormData.append('result.crop_to_foreground', 'true');
      urlFormData.append('result.target_size', '1500 1500');
      urlFormData.append('result.vertical_alignment', 'middle');
      urlFormData.append('output.format', 'jpeg');
      urlFormData.append('output.jpeg_quality', '90');
      urlFormData.append('result.margin', '0px 150px 0px 150px');

      const startTime1 = Date.now();
      const urlResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: urlFormData
      });

      const endTime1 = Date.now();
      const processingTime1 = endTime1 - startTime1;

      if (urlResponse.ok) {
        const urlBuffer = await urlResponse.arrayBuffer();
        const urlBase64 = Buffer.from(urlBuffer).toString('base64');
        
        results.urlMethod = {
          success: true,
          processingTime: processingTime1,
          size: urlBuffer.byteLength,
          image: `data:image/jpeg;base64,${urlBase64}`,
          method: 'URL'
        };
        console.log('✅ Método URL: Sucesso');
      } else {
        const errorText = await urlResponse.text();
        results.urlMethod = {
          success: false,
          error: `Status ${urlResponse.status}: ${errorText}`,
          processingTime: processingTime1,
          method: 'URL'
        };
        console.log('❌ Método URL: Erro');
      }
    } catch (error: any) {
      results.urlMethod = {
        success: false,
        error: error.message,
        method: 'URL'
      };
      console.log('❌ Método URL: Exceção');
    }

    // Método 2: Usando base64 (como implementamos)
    console.log('🔄 Testando método Base64...');
    try {
      // Baixar imagem e converter para base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      const base64FormData = new FormData();
      base64FormData.append('image', `data:image/jpeg;base64,${imageBase64}`);
      base64FormData.append('background.color', '#FFFFFF');
      base64FormData.append('result.crop_to_foreground', 'true');
      base64FormData.append('result.target_size', '1500 1500');
      base64FormData.append('result.vertical_alignment', 'middle');
      base64FormData.append('output.format', 'jpeg');
      base64FormData.append('output.jpeg_quality', '90');
      base64FormData.append('result.margin', '0px 150px 0px 150px');

      const startTime2 = Date.now();
      const base64Response = await fetch('https://api.pixian.ai/api/v2/remove-background', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4='
        },
        body: base64FormData
      });

      const endTime2 = Date.now();
      const processingTime2 = endTime2 - startTime2;

      if (base64Response.ok) {
        const base64Buffer = await base64Response.arrayBuffer();
        const base64Result = Buffer.from(base64Buffer).toString('base64');
        
        results.base64Method = {
          success: true,
          processingTime: processingTime2,
          size: base64Buffer.byteLength,
          image: `data:image/jpeg;base64,${base64Result}`,
          method: 'Base64'
        };
        console.log('✅ Método Base64: Sucesso');
      } else {
        const errorText = await base64Response.text();
        results.base64Method = {
          success: false,
          error: `Status ${base64Response.status}: ${errorText}`,
          processingTime: processingTime2,
          method: 'Base64'
        };
        console.log('❌ Método Base64: Erro');
      }
    } catch (error: any) {
      results.base64Method = {
        success: false,
        error: error.message,
        method: 'Base64'
      };
      console.log('❌ Método Base64: Exceção');
    }

    // Comparação dos resultados
    if (results.urlMethod.success && results.base64Method.success) {
      results.comparison = {
        timeDifference: Math.abs(results.urlMethod.processingTime - results.base64Method.processingTime),
        fasterMethod: results.urlMethod.processingTime < results.base64Method.processingTime ? 'URL' : 'Base64',
        sizeDifference: Math.abs(results.urlMethod.size - results.base64Method.size),
        sameSize: results.urlMethod.size === results.base64Method.size,
        urlTime: results.urlMethod.processingTime,
        base64Time: results.base64Method.processingTime
      };
    }

    console.log('📊 Comparação concluída');

    return NextResponse.json({
      success: true,
      message: 'Comparação de métodos concluída',
      data: results
    });

  } catch (error: any) {
    console.error('❌ Erro na comparação:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

// Endpoint GET para informações
export async function GET() {
  return NextResponse.json({
    message: 'API de comparação de métodos Pixian.ai',
    description: 'Compara o método URL vs Base64 para processamento de imagens',
    usage: {
      method: 'POST',
      body: {
        imageUrl: 'string (obrigatório) - URL da imagem para processar'
      },
      example: {
        imageUrl: 'https://projetoinfluencer.vteximg.com.br/arquivos/ids/5287720/Viseira-HD-Aba-Curva-Preta_638358924397754864.jpg'
      }
    },
    methods: {
      url: 'Usa image.url com URLSearchParams (como no curl original)',
      base64: 'Usa image com FormData e base64 (como implementado nos endpoints)'
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    // Buscar configurações VTEX do banco
    const configRows = await executeQuery(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
    `);

    if (!configRows || configRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Configurações VTEX não encontradas. Configure as credenciais primeiro.'
      }, { status: 400 });
    }

    // Construir configuração VTEX
    const config: any = {};
    configRows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    if (!config.vtex_account_name || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações VTEX incompletas. Verifique as credenciais.'
      }, { status: 400 });
    }

    // Construir URL da API VTEX - usando a URL correta do exemplo
    const baseURL = `https://${config.vtex_account_name}.${config.vtex_environment}.com.br`;
    const brandsEndpoint = '/api/catalog_system/pvt/brand/list';

    console.log(`🔄 Buscando marcas da VTEX: ${baseURL}${brandsEndpoint}`);

    // Buscar marcas da VTEX
    const response = await axios.get(`${baseURL}${brandsEndpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VTEX-API-AppKey': config.vtex_app_key,
        'X-VTEX-API-AppToken': config.vtex_app_token,
      },
      timeout: 30000,
    });

    if (response.status !== 200) {
      return NextResponse.json({
        success: false,
        message: `Erro na API VTEX: Status ${response.status}`
      }, { status: response.status });
    }

    const vtexBrands = response.data;
    
    if (!Array.isArray(vtexBrands)) {
      return NextResponse.json({
        success: false,
        message: 'Resposta inválida da API VTEX'
      }, { status: 400 });
    }

    console.log(`✅ Encontradas ${vtexBrands.length} marcas na VTEX`);

    // Limpar tabela de marcas antes de importar
    await executeQuery('DELETE FROM brands');

    // Processar e salvar marcas no banco
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const brand of vtexBrands) {
      try {
        // Inserir nova marca
        await executeQuery(`
          INSERT INTO brands (
            vtex_id, name, is_active, title, meta_tag_description, image_url
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          brand.id,
          brand.name || '',
          brand.isActive !== false,
          brand.title || null,
          brand.metaTagDescription || null,
          brand.imageUrl || null
        ]);
        importedCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Marca ${brand.name || brand.id}: ${error.message}`);
        console.error(`❌ Erro ao importar marca ${brand.name}:`, error);
      }
    }

    console.log(`✅ Importação concluída: ${importedCount} marcas importadas, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      message: `Importação concluída! ${importedCount} marcas importadas, ${errorCount} erros.`,
      data: {
        total: vtexBrands.length,
        imported: importedCount,
        errors: errorCount,
        errorDetails: errors
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao importar marcas:', error);
    
    let errorMessage = 'Erro desconhecido ao importar marcas';
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMessage = 'Credenciais VTEX inválidas. Verifique App Key e App Token.';
          break;
        case 403:
          errorMessage = 'Acesso negado. Verifique as permissões da sua API key.';
          break;
        case 404:
          errorMessage = 'Conta VTEX não encontrada. Verifique o nome da conta.';
          break;
        case 429:
          errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
          break;
        default:
          errorMessage = `Erro da API VTEX: ${status} - ${error.response.data?.message || 'Erro desconhecido'}`;
      }
    } else if (error.request) {
      errorMessage = 'Erro de conexão. Verifique sua internet e as configurações.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Timeout na conexão. A API VTEX pode estar lenta.';
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

interface VtexConfig {
  accountName: string;
  environment: string;
  appKey: string;
  appToken: string;
  openaiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const config: VtexConfig = await request.json();
    
    if (!config.accountName || !config.appKey || !config.appToken) {
      return NextResponse.json({
        success: false,
        message: 'Configurações incompletas. Preencha todos os campos obrigatórios.'
      }, { status: 400 });
    }

    // Construir URL base
    const baseUrl = `https://${config.accountName}.${config.environment}.com.br`;

    // Salvar configurações no banco de dados
    const configs = [
      { key: 'vtex_account_name', value: config.accountName },
      { key: 'vtex_environment', value: config.environment },
      { key: 'vtex_app_key', value: config.appKey },
      { key: 'vtex_app_token', value: config.appToken },
      { key: 'vtex_base_url', value: baseUrl },
      { key: 'openai_api_key', value: config.openaiKey || '' }
    ];

    for (const configItem of configs) {
      await executeQuery(`
        INSERT INTO system_config (config_key, config_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = CURRENT_TIMESTAMP
      `, [configItem.key, configItem.value]);
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso!'
    });

  } catch (error: any) {
    console.error('Erro ao salvar configurações:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao salvar configurações'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await executeQuery(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token', 'vtex_base_url', 'openai_api_key')
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Configurações não encontradas'
      }, { status: 404 });
    }

    // Converter array de configurações em objeto
    const config: VtexConfig = {
      accountName: '',
      environment: 'vtexcommercestable',
      appKey: '',
      appToken: '',
      openaiKey: ''
    };

    rows.forEach((row: any) => {
      switch (row.config_key) {
        case 'vtex_account_name':
          config.accountName = row.config_value || '';
          break;
        case 'vtex_environment':
          config.environment = row.config_value || 'vtexcommercestable';
          break;
        case 'vtex_app_key':
          config.appKey = row.config_value || '';
          break;
        case 'vtex_app_token':
          config.appToken = row.config_value || '';
          break;
        case 'openai_api_key':
          config.openaiKey = row.config_value || '';
          break;
      }
    });
    
    return NextResponse.json({
      success: true,
      config
    });

  } catch (error: any) {
    console.error('Erro ao carregar configurações:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao carregar configurações'
    }, { status: 500 });
  }
}

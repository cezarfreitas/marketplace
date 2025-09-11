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

    // Usar configurações VTEX do arquivo .env
    const config = {
      vtex_account_name: process.env.VTEX_ACCOUNT_NAME,
      vtex_environment: process.env.VTEX_ENVIRONMENT,
      vtex_app_key: process.env.VTEX_APP_KEY,
      vtex_app_token: process.env.VTEX_APP_TOKEN
    };

    if (!config.vtex_account_name || !config.vtex_app_key || !config.vtex_app_token) {
      return NextResponse.json({
        success: false,
        message: 'Configurações VTEX não encontradas no arquivo .env. Verifique as variáveis VTEX_ACCOUNT_NAME, VTEX_APP_KEY e VTEX_APP_TOKEN.'
      }, { status: 400 });
    }

    // Construir URL da API VTEX
    const baseURL = `https://${config.vtex_account_name}.${config.vtex_environment}.com.br`;
    const categoriesEndpoint = '/api/catalog/pvt/category';

    console.log(`🔄 Buscando categorias da VTEX: ${baseURL}${categoriesEndpoint}`);

    // Buscar categorias da VTEX
    const response = await axios.get(`${baseURL}${categoriesEndpoint}`, {
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

    const vtexCategories = response.data;
    
    if (!vtexCategories || !vtexCategories.Data || !Array.isArray(vtexCategories.Data)) {
      return NextResponse.json({
        success: false,
        message: 'Resposta inválida da API VTEX'
      }, { status: 400 });
    }

    const categories = vtexCategories.Data;
    console.log(`✅ Encontradas ${categories.length} categorias na VTEX`);

    // Limpar tabela de categorias antes de importar
    await executeQuery('DELETE FROM categories_vtex');

    // Processar e salvar categorias no banco
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const category of categories) {
      try {
        // Inserir nova categoria
        await executeQuery(`
          INSERT INTO categories_vtex (
            vtex_id, name, father_category_id, title, description, keywords,
            is_active, lomadee_campaign_code, adwords_remarketing_code,
            show_in_store_front, show_brand_filter, active_store_front_link,
            global_category_id, stock_keeping_unit_selection_mode, score,
            link_id, has_children, tree_path, tree_path_ids
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          category.Id,
          category.Name || '',
          category.FatherCategoryId || null,
          category.Title || null,
          category.Description || null,
          category.Keywords || null,
          category.IsActive !== false,
          category.LomadeeCampaignCode || null,
          category.AdWordsRemarketingCode || null,
          category.ShowInStoreFront !== false,
          category.ShowBrandFilter !== false,
          category.ActiveStoreFrontLink !== false,
          category.GlobalCategoryId || null,
          category.StockKeepingUnitSelectionMode || null,
          category.Score || 0,
          category.LinkId || null,
          category.HasChildren || false,
          category.TreePath || null,
          category.TreePathIds || null
        ]);
        importedCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Categoria ${category.Name || category.Id}: ${error.message}`);
        console.error(`❌ Erro ao importar categoria ${category.Name}:`, error);
      }
    }

    console.log(`✅ Importação concluída: ${importedCount} categorias importadas, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      message: `Importação concluída! ${importedCount} categorias importadas, ${errorCount} erros.`,
      data: {
        total: categories.length,
        imported: importedCount,
        errors: errorCount,
        errorDetails: errors
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao importar categorias:', error);
    
    let errorMessage = 'Erro desconhecido ao importar categorias';
    
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

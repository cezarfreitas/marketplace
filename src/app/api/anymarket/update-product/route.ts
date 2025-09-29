import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// Função auxiliar para salvar logs de sincronização - VERSÃO SIMPLIFICADA
async function saveSyncLog(productId: number, anymarketId: string, title: string, description: string, success: boolean, responseData: any, errorMessage?: string, syncType: string = 'info', action: string = 'update') {
  try {
    // Verificar se a tabela anymarket_sync_logs existe
    const tableCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'anymarket_sync_logs'
    `);
    
    if (tableCheck.length === 0) {
      console.log('⚠️ Tabela anymarket_sync_logs não existe - pulando log');
      return;
    }
    
    // Estrutura limpa e correta
    const logQuery = `
      INSERT INTO anymarket_sync_logs (id_produto_vtex, id_produto_any, title, description, sync_type, action, response_data, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      productId,
      anymarketId,
      title,
      description,
      syncType,
      action,
      JSON.stringify(responseData),
      errorMessage || null
    ];
    
    await executeQuery(logQuery, values);
    console.log('✅ Log de sincronização salvo com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar log de sincronização:', error);
    // Não relançar o erro para não interromper o processo principal
  }
}

/**
 * Converte texto puro em HTML formatado para a Anymarket
 */
function convertTextToHtml(text: string): string {
  if (!text) return text;
  
  // Se já contém HTML, retorna como está
  if (text.includes('<')) return text;
  
  // Dividir em seções baseado nos títulos em maiúsculo
  const sections = text.split(/([A-Z][A-Z\s]+[A-Z])/);
  let html = '';
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    if (!section) continue;
    
    // Se é um título em maiúsculo (seção)
    if (section.match(/^[A-Z][A-Z\s]+[A-Z]$/)) {
      html += `<b>${section}</b><br>`;
    } else {
      // Processar o conteúdo da seção
      let content = section;
      
      // Converter quebras de linha duplas em <br><br>
      content = content.replace(/\n\n/g, '<br><br>');
      
      // Converter quebras de linha simples em <br>
      content = content.replace(/\n/g, '<br>');
      
      // Converter perguntas em negrito (PERGUNTA:)
      content = content.replace(/(PERGUNTA:\s*[^<]+)/g, '<b>$1</b>');
      
      // Converter respostas (Resposta:)
      content = content.replace(/(Resposta:\s*[^<]+)/g, '<b>$1</b>');
      
      html += content + '<br><br>';
    }
  }
  
  // Limpar <br> extras no final
  html = html.replace(/(<br>)+$/, '');
  
  return html;
}

/**
 * API para atualizar produto no Anymarket
 * 
 * PROCESSO:
 * 1. Buscar título gerado da tabela titles (product_id VTEX → titles.id_product_vtex VTEX)
 * 2. Buscar descrição gerada da tabela descriptions (product_id VTEX → descriptions.id_product_vtex VTEX)
 * 3. ETAPA 1: Buscar dados atuais do produto no Anymarket (GET) - usa anymarketId na URL
 * 4. ETAPA 2: Enviar payload específico com título e descrição atualizados (PUT) - usa anymarketData.id na URL e payload
 * 
 * RELACIONAMENTOS:
 * - productId: ID do produto VTEX (vem do modal)
 * - titles.id_product_vtex: ID do produto VTEX (mesmo valor)
 * - descriptions.id_product_vtex: ID do produto VTEX (mesmo valor)
 * - anymarketId: ID do produto no Anymarket (vem do modal)
 * 
 * PAYLOAD ETAPA 2 (CAMPOS ESPECÍFICOS):
 * - APENAS estes campos podem ser enviados na Etapa 2
 * - Substitui os campos "title" e "description" com valores das tabelas titles e descriptions
 * - Todos os outros campos vêm APENAS do payload da primeira etapa (anymarketData)
 * - ID: usa anymarketData.id (já obtido na primeira etapa)
 * - CAMPOS PERMITIDOS:
 *   * id, title, description, category, brand, model, gender (da primeira etapa)
 *   * warrantyTime: 1, warrantyText: "Garantia de Fábrica", priceFactor: 1 (valores fixos)
 */

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    // Validar formato do anymarketId
    if (typeof anymarketId !== 'string' && typeof anymarketId !== 'number') {
      return NextResponse.json({
        success: false,
        message: 'anymarketId deve ser uma string ou número'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando processo direto: buscar e atualizar títulos...');
    console.log('📋 Product ID:', productId, 'Anymarket ID:', anymarketId, 'Type:', typeof anymarketId);

    // 1. Buscar título e descrição gerados
    // RELACIONAMENTO: product_id (VTEX) → titles.id_product_vtex (VTEX) e descriptions.id_product_vtex (VTEX)
    console.log('🔍 Buscando título e descrição gerados...');
    console.log('🔗 Relacionamento: product_id (VTEX):', productId, '→ titles.id_product_vtex (VTEX) e descriptions.id_product_vtex (VTEX)');
    
    // Buscar título
    const titleQuery = `
      SELECT title 
      FROM titles 
      WHERE id_product_vtex = ? 
        AND status = 'validated' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const titleResult = await executeQuery(titleQuery, [productId]);
    
    if (!titleResult || titleResult.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum título gerado encontrado para este produto'
      }, { status: 404 });
    }
    
    const newTitle = titleResult[0].title;
    console.log('📝 Título gerado encontrado:', newTitle);

    // Buscar descrição
    const descriptionQuery = `
      SELECT description 
      FROM descriptions 
      WHERE id_product_vtex = ? 
        AND status = 'generated' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const descriptionResult = await executeQuery(descriptionQuery, [productId]);
    
    let newDescription = null;
    if (descriptionResult && descriptionResult.length > 0) {
      newDescription = descriptionResult[0].description;
      console.log('📄 Descrição gerada encontrada:', newDescription.substring(0, 100) + '...');
      
      // Converter texto puro para HTML se necessário
      if (newDescription && !newDescription.includes('<')) {
        console.log('🔄 Convertendo descrição de texto puro para HTML...');
        newDescription = convertTextToHtml(newDescription);
        console.log('✅ Descrição convertida para HTML');
      }
    } else {
      console.log('⚠️ Nenhuma descrição gerada encontrada para este produto');
    }

    // Buscar características do produto
    console.log('🔍 Buscando características do produto...');
    const characteristicsQuery = `
      SELECT 
        rc.caracteristica,
        rc.resposta
      FROM respostas_caracteristicas rc
      WHERE rc.produto_id = ? 
        AND rc.resposta IS NOT NULL 
        AND rc.resposta != ''
        AND TRIM(rc.resposta) != ''
      ORDER BY rc.caracteristica ASC
    `;
    
    const characteristicsResult = await executeQuery(characteristicsQuery, [productId]);
    let productCharacteristics: any[] = [];
    
    if (characteristicsResult && characteristicsResult.length > 0) {
      productCharacteristics = characteristicsResult.map((char, index) => ({
        index: index + 1,
        name: char.caracteristica,
        value: char.resposta
      }));
      console.log(`✅ ${productCharacteristics.length} características encontradas:`, productCharacteristics.map(c => c.name).join(', '));
      console.log('📋 Características detalhadas:', productCharacteristics);
    } else {
      console.log('⚠️ Nenhuma característica encontrada para este produto');
      console.log('🔍 Query executada:', characteristicsQuery);
      console.log('🔍 Product ID usado:', productId);
    }

    // 2. Buscar dados atuais do produto no Anymarket (ETAPA 1)
    console.log('🔍 ETAPA 1: Buscando dados atuais do produto no Anymarket...');
    const anymarketUrl = `https://api.anymarket.com.br/v2/products/${anymarketId}`;
    console.log('🌐 URL da requisição:', anymarketUrl);
    console.log('🔍 anymarketId na URL:', anymarketId, 'Tipo:', typeof anymarketId);
    
    const getResponse = await fetch(anymarketUrl, {
      method: 'GET',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      console.error('❌ Erro ao buscar dados atuais:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar dados atuais do produto: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: getResponse.status });
    }

    const anymarketData = await getResponse.json();
    console.log('✅ ETAPA 1 CONCLUÍDA: Dados do Anymarket obtidos');
    console.log('📋 ID do produto no Anymarket:', anymarketData.id, 'Tipo:', typeof anymarketData.id);

    // 3. Verificar se título, descrição ou características precisam ser atualizados
    const updates = [];
    let needsUpdate = false;
    
    // Verificar título
    if (anymarketData.title !== newTitle) {
      console.log(`📝 Título será atualizado: "${anymarketData.title}" → "${newTitle}"`);
      updates.push({
        field: 'Título do Produto',
        oldValue: anymarketData.title,
        newValue: newTitle
      });
      needsUpdate = true;
    } else {
      console.log('ℹ️ Título já está sincronizado');
    }

    // Verificar descrição (apenas se existe descrição gerada)
    if (newDescription && anymarketData.description !== newDescription) {
      console.log(`📄 Descrição será atualizada`);
      console.log(`📄 Descrição atual (${anymarketData.description.length} chars): ${anymarketData.description.substring(0, 100)}...`);
      console.log(`📄 Nova descrição (${newDescription.length} chars): ${newDescription.substring(0, 100)}...`);
      updates.push({
        field: 'Descrição do Produto',
        oldValue: anymarketData.description,
        newValue: newDescription
      });
      needsUpdate = true;
    } else if (newDescription) {
      console.log('ℹ️ Descrição já está sincronizada');
    } else {
      console.log('ℹ️ Nenhuma descrição gerada encontrada - mantendo descrição atual');
    }

    // Verificar características
    if (productCharacteristics.length > 0) {
      console.log(`🔧 ${productCharacteristics.length} características serão enviadas`);
      updates.push({
        field: 'Características do Produto',
        oldValue: 'N/A',
        newValue: `${productCharacteristics.length} características`
      });
      needsUpdate = true;
    } else {
      console.log('ℹ️ Nenhuma característica encontrada para enviar');
    }

    // Se não há atualizações necessárias
    if (!needsUpdate) {
      return NextResponse.json({
        success: true,
        message: 'Título, descrição e características já estão sincronizados - nenhuma atualização necessária',
        data: {
          anymarket_id: anymarketId,
          action: 'no_updates_needed',
          updates: [],
          response: anymarketData
        }
      });
    }

    // 4. ETAPA 2: Preparar payload específico para PUT
    // IMPORTANTE: APENAS os campos específicos permitidos podem ser enviados
    // Valores vêm APENAS do payload da primeira etapa (anymarketData)
    // VALORES FIXOS OBRIGATÓRIOS: warrantyTime=1, warrantyText="Garantia de Fábrica", priceFactor=1
    console.log('🔄 ETAPA 2: Preparando payload específico para PUT...');
    
    // Extrair valor da característica "modelo" diretamente da tabela respostas_caracteristicas
    let modeloValue = anymarketData.model; // valor padrão
    console.log('🔍 Valor padrão do model:', modeloValue);
    
    // Buscar características diretamente da tabela respostas_caracteristicas
    const modelCharacteristicsQuery = `
      SELECT caracteristica, resposta 
      FROM respostas_caracteristicas 
      WHERE produto_id = ?
    `;
    
    const characteristicsData = await executeQuery(modelCharacteristicsQuery, [productId]);
    console.log('📋 Características encontradas na tabela:', characteristicsData.length);
    
    // Procurar pela característica "modelo"
    console.log('🔍 Procurando característica "modelo" em:', characteristicsData.map(c => c.caracteristica));
    const modeloChar = characteristicsData.find((char: any) => 
      char.caracteristica && char.caracteristica.toLowerCase().includes('modelo')
    );
    
    if (modeloChar && modeloChar.resposta) {
      modeloValue = modeloChar.resposta;
      console.log('✅ Valor da característica "modelo" encontrado na tabela:', modeloValue);
      console.log('✅ Característica completa:', modeloChar);
    } else {
      console.log('❌ Característica "modelo" não encontrada na tabela respostas_caracteristicas');
      console.log('🔍 Características disponíveis:', characteristicsData.map(c => ({ caracteristica: c.caracteristica, resposta: c.resposta })));
    }
    
    // Usar APENAS os campos específicos permitidos na Etapa 2
    // Valores vêm APENAS do payload da primeira etapa (anymarketData)
    // ID: usa o id do anymarketData (já obtido na primeira etapa)
    const putPayload = {
      id: anymarketData.id, // ← ID do produto no Anymarket (da primeira etapa)
      title: newTitle, // ← Título da tabela titles
      description: newDescription || anymarketData.description, // ← Descrição da tabela descriptions ou manter atual
      category: anymarketData.category,
      brand: anymarketData.brand,
      model: modeloValue, // ← Valor da característica "modelo" ou valor padrão
      gender: anymarketData.gender,
      warrantyTime: 1, // ← VALOR FIXO OBRIGATÓRIO
      warrantyText: "Garantia de Fábrica", // ← VALOR FIXO OBRIGATÓRIO
      priceFactor: 1, // ← VALOR FIXO OBRIGATÓRIO
      characteristics: productCharacteristics // ← Características da tabela respostas_caracteristicas
    };

    console.log('📦 Payload PUT (campos específicos permitidos):', JSON.stringify(putPayload, null, 2));
    console.log('🔍 Valor final do model no payload:', putPayload.model);
    console.log('🔍 Características incluídas no payload:', productCharacteristics.length > 0 ? productCharacteristics.map(c => `${c.name}: ${c.value}`).join(', ') : 'Nenhuma');
    console.log('🔍 Estrutura do campo characteristics no payload:', JSON.stringify(putPayload.characteristics, null, 2));

    // 5. ETAPA 2: Fazer PATCH para atualizar produto (recomendado para características)
    console.log('🔄 ETAPA 2: Fazendo PATCH para atualizar produto...');
    
    // Preparar payload PATCH com operações específicas
    const patchOperations = [];
    
    // Adicionar operação para atualizar título se necessário
    if (anymarketData.title !== newTitle) {
      patchOperations.push({
        op: 'replace',
        path: '/title',
        value: newTitle
      });
    }
    
    // Adicionar operação para atualizar descrição se necessário
    if (newDescription && anymarketData.description !== newDescription) {
      patchOperations.push({
        op: 'replace',
        path: '/description',
        value: newDescription
      });
    }
    
    // Adicionar operação para atualizar características se existirem
    if (productCharacteristics.length > 0) {
      patchOperations.push({
        op: 'replace',
        path: '/characteristics',
        value: productCharacteristics
      });
    }
    
    const patchPayload = {
      title: newTitle,
      description: newDescription || anymarketData.description,
      characteristics: productCharacteristics
    };

    // Adicionar campo model se foi extraído da característica
    if (modeloValue && modeloValue !== anymarketData.model) {
      patchPayload.model = modeloValue;
      console.log('✅ Campo model adicionado ao payload PATCH:', modeloValue);
    }

    console.log('📦 Payload PATCH (merge-patch):', JSON.stringify(patchPayload, null, 2));
    
    const patchResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketData.id}`, {
      method: 'PATCH',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/merge-patch+json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(patchPayload),
      cache: 'no-store'
    });

    console.log('📡 Resposta do PATCH:', {
      status: patchResponse.status,
      statusText: patchResponse.statusText,
      ok: patchResponse.ok
    });

    if (!patchResponse.ok) {
      const errorData = await patchResponse.json();
      console.error('❌ Erro no PATCH:', errorData);
      throw new Error(`Erro ao atualizar produto: ${errorData.message || 'Erro desconhecido'}`);
    }

    const patchResult = await patchResponse.json();
    console.log('✅ ETAPA 2 CONCLUÍDA: PATCH realizado com sucesso:', patchResult);

    // 3. Salvar log de sincronização na tabela anymarket_sync_logs
    try {
      await saveSyncLog(
        productId,
        anymarketId.toString(),
        newTitle,
        newDescription || '',
        true,
        patchResult,
        undefined,
        'info',
        'update'
      );
      console.log('📅 Log de sincronização salvo na tabela anymarket_sync_logs');
    } catch (logError) {
      console.error('⚠️ Erro ao salvar log de sincronização (não crítico):', logError);
    }

    // Determinar quais campos foram atualizados para a mensagem
    const updatedFields = updates.map(update => update.field).join(' e ');
    const characteristicsMessage = productCharacteristics.length > 0 ? ` e ${productCharacteristics.length} características` : '';
    
    return NextResponse.json({
      success: true,
      message: `Produto atualizado com sucesso: ${updatedFields}${characteristicsMessage} atualizados`,
      data: {
        anymarket_id: anymarketId,
        action: 'product_updated_patch',
        updates: updates,
        characteristics: productCharacteristics,
        characteristics_count: productCharacteristics.length,
        patch_payload: {
          title: newTitle,
          description: newDescription || anymarketData.description,
          characteristics: productCharacteristics
        },
        response: patchResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar produto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao atualizar produto',
      error: error.message
    }, { status: 500 });
  }
}

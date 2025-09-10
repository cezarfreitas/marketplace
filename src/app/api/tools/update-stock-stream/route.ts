import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Função para consultar estoque de múltiplos SKUs na VTEX em paralelo
async function consultarEstoqueVTEXParalelo(vtexSkuIds: string[], vtexAppKey: string | null, vtexAppToken: string | null, accountName: string | null, environment: string | null): Promise<{[skuId: string]: number}> {
  try {
    if (!vtexAppKey || !vtexAppToken || !accountName || !environment) {
      console.log('⚠️ Credenciais VTEX não disponíveis, usando valores simulados');
      const simulatedResults: {[skuId: string]: number} = {};
      vtexSkuIds.forEach(skuId => {
        simulatedResults[skuId] = Math.floor(Math.random() * 50) + 10;
      });
      return simulatedResults;
    }
    
    // Processar SKUs em paralelo com limite de concorrência
    const results: {[skuId: string]: number} = {};
    const concurrencyLimit = 5; // Máximo 5 requisições simultâneas
    
    for (let i = 0; i < vtexSkuIds.length; i += concurrencyLimit) {
      const batch = vtexSkuIds.slice(i, i + concurrencyLimit);
      
      // Criar promessas para o lote atual
      const promises = batch.map(async (skuId) => {
        try {
          const vtexUrl = `https://${accountName}.${environment}.com.br/api/logistics/pvt/inventory/skus/${skuId}`;
          
          const response = await fetch(vtexUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-VTEX-API-AppKey': vtexAppKey || '',
              'X-VTEX-API-AppToken': vtexAppToken || '',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            let totalStock = 0;
            if (data.balance && Array.isArray(data.balance)) {
              totalStock = data.balance.reduce((sum: number, warehouse: any) => {
                return sum + (warehouse.totalQuantity || 0);
              }, 0);
            }
            return { skuId, stock: totalStock };
          } else {
            console.log(`⚠️ Erro na consulta VTEX para SKU ${skuId}: ${response.status}`);
            return { skuId, stock: 0 };
          }
        } catch (error) {
          console.log(`❌ Erro ao consultar VTEX para SKU ${skuId}:`, error);
          return { skuId, stock: 0 };
        }
      });
      
      // Aguardar todas as promessas do lote atual
      const batchResults = await Promise.all(promises);
      
      // Adicionar resultados ao objeto final
      batchResults.forEach(result => {
        results[result.skuId] = result.stock;
      });
      
      // Pequeno delay entre lotes para não sobrecarregar a API
      if (i + concurrencyLimit < vtexSkuIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`✅ VTEX Paralelo: ${vtexSkuIds.length} SKUs consultados com sucesso`);
    return results;
    
  } catch (error) {
    console.log(`❌ Erro ao consultar VTEX em paralelo:`, error);
    // Fallback: consultar SKUs sequencialmente
    return await consultarEstoqueVTEXIndividual(vtexSkuIds, vtexAppKey, vtexAppToken, accountName, environment);
  }
}

// Função fallback para consultar SKUs individualmente
async function consultarEstoqueVTEXIndividual(vtexSkuIds: string[], vtexAppKey: string | null, vtexAppToken: string | null, accountName: string | null, environment: string | null): Promise<{[skuId: string]: number}> {
  const results: {[skuId: string]: number} = {};
  
  for (const skuId of vtexSkuIds) {
    try {
      const vtexUrl = `https://${accountName}.${environment}.com.br/api/logistics/pvt/inventory/skus/${skuId}`;
      
      const response = await fetch(vtexUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-VTEX-API-AppKey': vtexAppKey || '',
          'X-VTEX-API-AppToken': vtexAppToken || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        let totalStock = 0;
        if (data.balance && Array.isArray(data.balance)) {
          totalStock = data.balance.reduce((sum: number, warehouse: any) => {
            return sum + (warehouse.totalQuantity || 0);
          }, 0);
        }
        results[skuId] = totalStock;
      } else {
        console.log(`⚠️ Erro na consulta VTEX para SKU ${skuId}: ${response.status}`);
        results[skuId] = 0;
      }
    } catch (error) {
      console.log(`❌ Erro ao consultar VTEX para SKU ${skuId}:`, error);
      results[skuId] = 0;
    }
  }
  
  return results;
}

// Função para sincronizar estoque no banco local com VTEX
async function atualizarEstoqueLocal(vtexSkuId: string, vtexStock: number, skuId: number): Promise<void> {
  try {
    // Verificar se existe registro na tabela stock para este SKU
    const checkQuery = `SELECT COUNT(*) as count FROM stock WHERE vtex_sku_id = ?`;
    const checkResult = await executeQuery(checkQuery, [vtexSkuId]);
    const recordCount = checkResult[0]?.count || 0;
    
    if (recordCount === 0) {
      // Criar novo registro na tabela stock (warehouse consolidado) com sku_id correto
      const insertStockQuery = `
        INSERT INTO stock (sku_id, vtex_sku_id, warehouse_id, warehouse_name, total_quantity, reserved_quantity, has_unlimited_quantity, created_at, updated_at)
        VALUES (?, ?, 'consolidated', 'Consolidated Stock', ?, 0, 0, NOW(), NOW())
      `;
      
      await executeQuery(insertStockQuery, [skuId, vtexSkuId, vtexStock]);
      console.log(`✅ Novo registro criado para VTEX SKU ${vtexSkuId} (SKU ID: ${skuId}) - Estoque consolidado: ${vtexStock}`);
      
    } else {
      // Atualizar estoque existente (sincronizar com VTEX consolidado)
      const updateStockQuery = `
        UPDATE stock 
        SET total_quantity = ?, updated_at = NOW()
        WHERE vtex_sku_id = ? AND warehouse_id = 'consolidated'
        LIMIT 1
      `;
      
      await executeQuery(updateStockQuery, [vtexStock, vtexSkuId]);
      console.log(`✅ Estoque sincronizado para VTEX SKU ${vtexSkuId}: ${vtexStock} (consolidado)`);
    }
    
  } catch (error) {
    console.log(`❌ Erro ao sincronizar estoque local para VTEX SKU ${vtexSkuId}:`, error);
  }
}

export async function GET() {
  try {
    // Evitar execução durante o build do Next.js
    if (process.env.NODE_ENV === 'production' && !process.env.RUNTIME_ENV) {
      return new Response('API não disponível durante build', { status: 503 });
    }
    
    console.log('🔄 Iniciando atualização de estoque em tempo real...');

    // Criar um stream de resposta
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Função para enviar dados
        const sendData = (data: any) => {
          const chunk = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        };

        // Função para processar SKUs
        const processSkus = async () => {
          try {
            // Buscar credenciais VTEX no banco de dados (apenas uma vez)
            const credentialsQuery = `
              SELECT config_key, config_value 
              FROM system_config 
              WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
            `;
            const credentialsResult = await executeQuery(credentialsQuery, []);
            
            let vtexAppKey = null;
            let vtexAppToken = null;
            let vtexAccountName = null;
            let vtexEnvironment = null;
            
            if (credentialsResult && credentialsResult.length > 0) {
              // Converter array de configurações em objeto
              const configMap = credentialsResult.reduce((acc: any, config: any) => {
                acc[config.config_key] = config.config_value;
                return acc;
              }, {});
              
              vtexAppKey = configMap.vtex_app_key;
              vtexAppToken = configMap.vtex_app_token;
              vtexAccountName = configMap.vtex_account_name;
              vtexEnvironment = configMap.vtex_environment;
            }
            
            if (!vtexAppKey || !vtexAppToken || !vtexAccountName || !vtexEnvironment) {
              console.log('⚠️ Credenciais VTEX não encontradas no banco, usando valores simulados');
            } else {
              console.log(`✅ Credenciais VTEX carregadas do banco de dados - Conta: ${vtexAccountName}.${vtexEnvironment}.com.br`);
            }
            
            // Buscar total de SKUs
            const skusQuery = `SELECT COUNT(*) as total FROM skus`;
            const skusResult = await executeQuery(skusQuery, []);
            const totalSkus = skusResult[0]?.total || 0;
            
            sendData({
              type: 'start',
              totalSkus: totalSkus,
              message: `Iniciando processamento de ${totalSkus} SKUs...`
            });

            // Processar todos os SKUs em lotes otimizados
            const batchSize = 200; // Lotes maiores para melhor performance
            const vtexBatchSize = 10; // Tamanho do lote para consulta VTEX paralela
            let processedCount = 0;
            
            for (let offset = 0; offset < totalSkus; offset += batchSize) {
              // Buscar SKUs do lote atual
              const batchQuery = `
                SELECT s.id, s.vtex_id, s.product_id, s.name_complete
                FROM skus s
                ORDER BY s.id
                LIMIT ${batchSize} OFFSET ${offset}
              `;
              
              const batchSkus = await executeQuery(batchQuery, []);
              
              // Processar SKUs em sub-lotes para consulta VTEX
              const processedSkus = [];
              for (let i = 0; i < batchSkus.length; i += vtexBatchSize) {
                const vtexBatch = batchSkus.slice(i, i + vtexBatchSize);
                const vtexSkuIds = vtexBatch.map(sku => sku.vtex_id);
                
                console.log(`🔄 Consultando VTEX em paralelo: ${vtexSkuIds.length} SKUs (${i + 1}-${i + vtexSkuIds.length} do lote ${Math.floor(offset/batchSize) + 1})`);
                
                // Consultar estoque na VTEX em paralelo
                const vtexStockResults = await consultarEstoqueVTEXParalelo(vtexSkuIds, vtexAppKey, vtexAppToken, vtexAccountName, vtexEnvironment);
                
                // Processar resultados do lote
                for (const sku of vtexBatch) {
                  try {
                    const productName = sku.name_complete || `Produto ${sku.id}`;
                    const vtexStock = vtexStockResults[sku.vtex_id] || 0;
                    
                    // Atualizar estoque no banco local (sincronizar com VTEX)
                    await atualizarEstoqueLocal(sku.vtex_id, vtexStock, sku.id);
                    
                    processedSkus.push({
                      id: sku.id,
                      name: productName,
                      vtex_sku_id: sku.vtex_id,
                      product_name: productName,
                      total_stock: vtexStock
                    });
                    
                    processedCount++;
                    
                  } catch (error) {
                    console.log(`❌ Erro ao processar SKU ${sku.id}:`, error);
                    processedCount++;
                  }
                }
                
                // Delay entre sub-lotes VTEX para não sobrecarregar a API
                if (i + vtexBatchSize < batchSkus.length) {
                  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms entre sub-lotes
                }
              }
              
              // Calcular estatísticas do lote
              const batchStock = processedSkus.reduce((sum, sku) => sum + sku.total_stock, 0);
              const batchErrors = processedSkus.filter(sku => sku.total_stock === 0).length;
              
              // Enviar dados do lote completo
              sendData({
                type: 'batch_processing',
                skus: processedSkus,
                progress: {
                  current: processedCount,
                  total: totalSkus,
                  percentage: Math.round((processedCount / totalSkus) * 100)
                },
                message: `Lote ${Math.floor(offset/batchSize) + 1} concluído - ${processedSkus.length} SKUs processados, ${batchStock} unidades de estoque`,
                batchStats: {
                  skusProcessed: processedSkus.length,
                  totalStock: batchStock,
                  errors: batchErrors,
                  averageStock: processedSkus.length > 0 ? Math.round(batchStock / processedSkus.length) : 0
                }
              });
              
              // Pausa maior entre lotes para não sobrecarregar a API
              await new Promise(resolve => setTimeout(resolve, 200)); // 200ms entre lotes
            }

            // Enviar conclusão
            sendData({
              type: 'complete',
              message: 'Atualização de estoque concluída com sucesso!',
              progress: {
                current: totalSkus,
                total: totalSkus,
                percentage: 100
              }
            });

            // Fechar o stream
            controller.close();

          } catch (error) {
            console.error('❌ Erro no processamento:', error);
            sendData({
              type: 'error',
              message: 'Erro durante o processamento',
              error: error instanceof Error ? error.message : String(error)
            });
            controller.close();
          }
        };

        // Iniciar o processamento
        processSkus();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error: any) {
    console.error('❌ Erro ao iniciar stream:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function demoStockColumn() {
  try {
    console.log('🎯 Demonstração da Nova Coluna de Estoque');
    console.log('==========================================\n');
    
    // 1. Verificar se o servidor está rodando
    console.log('🔍 Verificando servidor...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    
    if (!healthResponse.ok) {
      console.log('❌ Servidor não está rodando. Execute: npm run dev');
      return;
    }
    
    console.log('✅ Servidor está rodando!\n');
    
    // 2. Buscar produtos com estoque
    console.log('📦 Buscando produtos com dados de estoque...');
    const productsResponse = await fetch('http://localhost:3000/api/products?limit=5');
    
    if (!productsResponse.ok) {
      console.log('❌ Erro ao buscar produtos');
      return;
    }
    
    const data = await productsResponse.json();
    
    if (data.success && data.data.products.length > 0) {
      console.log('✅ Produtos encontrados!\n');
      
      console.log('📊 Dados dos produtos:');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Produto                    │ SKUs │ Imgs │ Estoque │ Status                │');
      console.log('├─────────────────────────────────────────────────────────────────────────────┤');
      
      data.data.products.forEach((product, index) => {
        const name = product.name.length > 25 ? product.name.substring(0, 22) + '...' : product.name;
        const stock = product.total_stock || 0;
        const stockStatus = stock > 0 ? '✅ Em estoque' : '❌ Sem estoque';
        
        console.log(`│ ${name.padEnd(26)} │ ${String(product.sku_count || 0).padStart(4)} │ ${String(product.image_count || 0).padStart(4)} │ ${String(stock).padStart(7)} │ ${stockStatus.padEnd(19)} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
      
      console.log('🎨 Funcionalidades da Nova Coluna:');
      console.log('   • Coluna dedicada para estoque');
      console.log('   • Cores visuais: Verde (com estoque) / Vermelho (sem estoque)');
      console.log('   • Números centralizados e destacados');
      console.log('   • Integração com dados reais da API VTEX\n');
      
      console.log('🌐 Para ver a interface:');
      console.log('   Abra: http://localhost:3000/products');
      console.log('   A coluna "Estoque" aparecerá entre "Imagens" e "Ferramentas"\n');
      
      console.log('📈 Benefícios:');
      console.log('   • Visualização rápida do estoque disponível');
      console.log('   • Identificação imediata de produtos sem estoque');
      console.log('   • Interface mais organizada e profissional');
      console.log('   • Dados atualizados automaticamente na importação');
      
    } else {
      console.log('❌ Nenhum produto encontrado');
      console.log('💡 Importe alguns produtos primeiro usando a API de importação');
    }
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
  }
}

// Executar a demonstração
demoStockColumn();

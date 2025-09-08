'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import { 
  Bot, 
  Brain, 
  Image, 
  ShoppingCart, 
  Search,
  Edit,
  Save,
  XCircle,
  Settings,
  Eye,
  Zap
} from 'lucide-react';


interface Agent {
  id: number;
  name: string;
  description?: string;
  function_type: string;
  model: string;
  max_tokens: number;
  temperature: number;
  system_prompt?: string;
  guidelines_template?: string;
  analysis_type?: string;
  timeout?: number;
  max_images?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AGENT_TYPES = {
  'brand_analysis': {
    name: 'Agente de Marcas',
    description: 'Especializado em análise completa de marcas para marketing e SEO',
    icon: Brain,
    color: 'purple'
  },
  'image_analysis': {
    name: 'Agente de Imagens',
    description: 'Especializado em análise e otimização de imagens de produtos',
    icon: Image,
    color: 'blue'
  },
  'mercado_livre': {
    name: 'Agente de Marketplace',
    description: 'Especializado em otimização de anúncios para Marketplace',
    icon: ShoppingCart,
    color: 'yellow'
  },
  'seo_vtex': {
    name: 'Agente de SEO VTEX',
    description: 'Especializado em otimização SEO para plataforma VTEX',
    icon: Search,
    color: 'green'
  }
};

const DEFAULT_AGENTS = [
  {
    name: 'Agente de Marcas',
    description: 'Especializado em análise completa de marcas para marketing e SEO',
    function_type: 'brand_analysis',
    model: 'gpt-3.5-turbo',
    max_tokens: 1500,
    temperature: 0.7,
    system_prompt: 'Você é um especialista em marketing digital e SEO com vasta experiência em análise de marcas. Sua função é criar análises completas e detalhadas que sejam úteis para estratégias de marketing, SEO e posicionamento de marca.\n\nINSTRUÇÕES ESPECÍFICAS:\n- Sempre analise a marca de forma profunda e estratégica\n- Foque em insights práticos e acionáveis para marketing\n- Considere o contexto brasileiro e o mercado local\n- Use linguagem profissional mas acessível\n- Estruture a análise de forma clara e organizada\n- Inclua dados específicos e mensuráveis quando possível\n- Considere tendências atuais de mercado e comportamento do consumidor\n- Foque em diferenciação competitiva e propostas de valor únicas',
    guidelines_template: '## DIRETRIZES ESPECÍFICAS (OPCIONAL)\n\nAdicione aqui instruções específicas para personalizar a análise:\n\n**FOCO ESTRATÉGICO:**\n- Foque em [área específica: digital, offline, e-commerce, B2B, B2C]\n- Enfatize [aspecto importante: sustentabilidade, inovação, tradição, qualidade]\n- Considere [contexto específico: região, sazonalidade, tendências]\n\n**LINGUAGEM E TOM:**\n- Use linguagem [tipo: formal, jovem, técnica, descontraída, premium]\n- Tom de voz [estilo: autoritário, amigável, inspirador, consultivo]\n- Público-alvo [específico: executivos, jovens, famílias, profissionais]\n\n**ANÁLISE ESPECÍFICA:**\n- Dê ênfase especial em [área: SEO, redes sociais, e-commerce, experiência do cliente]\n- Considere [fatores: concorrência local, sazonalidade, eventos]\n- Inclua [elementos: métricas, KPIs, benchmarks, comparações]\n\n**EXEMPLOS DE DIRETRIZES:**\n- "Foque no público jovem urbano, use linguagem descontraída, enfatize sustentabilidade"\n- "Análise para e-commerce B2B, linguagem técnica, considere decisores de compra"\n- "Público premium, linguagem sofisticada, enfatize exclusividade e qualidade"',
    is_active: true
  },
  {
    name: 'Agente de Imagens',
    description: 'Especializado em análise e otimização de imagens de produtos',
    function_type: 'image_analysis',
    model: 'gpt-4-vision-preview',
    max_tokens: 2000,
    temperature: 0.5,
    system_prompt: 'Você é um especialista em análise de imagens de produtos e otimização visual para e-commerce. Sua função é analisar imagens de produtos e fornecer insights valiosos sobre qualidade, composição, otimização e estratégias visuais.\n\nINSTRUÇÕES ESPECÍFICAS:\n- Analise a qualidade técnica das imagens (resolução, iluminação, foco)\n- Avalie a composição e elementos visuais\n- Identifique oportunidades de melhoria\n- Sugira otimizações para conversão\n- Considere as melhores práticas de e-commerce\n- Foque em aspectos que impactam a decisão de compra\n- Forneça recomendações práticas e acionáveis',
    guidelines_template: '## DIRETRIZES ESPECÍFICAS (OPCIONAL)\n\n**TIPO DE PRODUTO:**\n- Categoria: [roupas, eletrônicos, casa, beleza, esportes, etc.]\n- Público-alvo: [jovens, adultos, profissionais, famílias]\n- Posicionamento: [premium, popular, luxo, acessível]\n\n**FOCO DA ANÁLISE:**\n- Enfatize: [qualidade técnica, composição, conversão, branding]\n- Considere: [tendências visuais, concorrência, sazonalidade]\n- Avalie: [iluminação, cores, ângulos, contexto]\n\n**RECOMENDAÇÕES:**\n- Priorize: [conversão, branding, qualidade, velocidade de carregamento]\n- Sugira: [melhorias técnicas, composição, elementos adicionais]\n- Considere: [múltiplas imagens, vídeos, 360°, zoom]',
    is_active: true
  },
  {
    name: 'Agente de Marketplace',
    description: 'Especializado em otimização de anúncios para Marketplace',
    function_type: 'mercado_livre',
    model: 'gpt-3.5-turbo',
    max_tokens: 1800,
    temperature: 0.6,
    system_prompt: 'Você é um especialista em otimização de anúncios para Marketplace com vasta experiência em e-commerce brasileiro. Sua função é criar títulos, descrições e estratégias otimizadas para maximizar a visibilidade e conversão no Marketplace.\n\nINSTRUÇÕES ESPECÍFICAS:\n- Otimize títulos para SEO e conversão no Marketplace\n- Crie descrições persuasivas e informativas\n- Use palavras-chave relevantes e populares\n- Considere o algoritmo de ranqueamento do Marketplace\n- Foque em benefícios e diferenciais do produto\n- Inclua informações técnicas importantes\n- Use linguagem clara e direta\n- Considere o público brasileiro e suas preferências',
    guidelines_template: '## DIRETRIZES ESPECÍFICAS (OPCIONAL)\n\n**CATEGORIA E PRODUTO:**\n- Categoria ML: [eletrônicos, casa, moda, esportes, etc.]\n- Tipo: [novo, usado, recondicionado, importado]\n- Marca: [conhecida, desconhecida, genérica]\n\n**ESTRATÉGIA DE OTIMIZAÇÃO:**\n- Foque em: [visibilidade, conversão, preço, qualidade]\n- Palavras-chave: [específicas, populares, sazonais]\n- Tom: [técnico, amigável, persuasivo, informativo]\n\n**PÚBLICO-ALVO:**\n- Demografia: [jovens, adultos, famílias, profissionais]\n- Comportamento: [compradores frequentes, ocasionais, pesquisadores]\n- Prioridades: [preço, qualidade, marca, entrega rápida]\n\n**ELEMENTOS ESPECÍFICOS:**\n- Inclua: [garantia, frete grátis, parcelamento, estoque]\n- Destaque: [diferenciais, benefícios, características únicas]\n- Evite: [termos proibidos, informações falsas, spam]',
    is_active: true
  },
  {
    name: 'Agente de SEO VTEX',
    description: 'Especializado em otimização SEO para plataforma VTEX',
    function_type: 'seo_vtex',
    model: 'gpt-3.5-turbo',
    max_tokens: 1600,
    temperature: 0.7,
    system_prompt: 'Você é um especialista em SEO para e-commerce com foco na plataforma VTEX. Sua função é otimizar produtos, categorias e páginas para melhorar o ranqueamento nos mecanismos de busca e aumentar o tráfego orgânico.\n\nINSTRUÇÕES ESPECÍFICAS:\n- Otimize títulos e meta descriptions para SEO\n- Sugira palavras-chave relevantes e de baixa concorrência\n- Crie conteúdo otimizado para produtos e categorias\n- Considere a estrutura de URLs da VTEX\n- Foque em SEO técnico e on-page\n- Considere o comportamento de busca brasileiro\n- Inclua schema markup quando apropriado\n- Otimize para mobile e Core Web Vitals',
    guidelines_template: '## DIRETRIZES ESPECÍFICAS (OPCIONAL)\n\n**NICHO E MERCADO:**\n- Setor: [moda, eletrônicos, casa, beleza, esportes, etc.]\n- Concorrência: [alta, média, baixa]\n- Sazonalidade: [alta, média, baixa]\n\n**ESTRATÉGIA SEO:**\n- Foque em: [palavras-chave de cauda longa, local, sazonal]\n- Priorize: [tráfego, conversão, autoridade, relevância]\n- Considere: [concorrência, tendências, sazonalidade]\n\n**PÚBLICO-ALVO:**\n- Demografia: [idade, gênero, localização, renda]\n- Intenção: [informacional, transacional, navegacional]\n- Comportamento: [mobile, desktop, horários de pico]\n\n**OTIMIZAÇÕES ESPECÍFICAS:**\n- Técnicas: [velocidade, mobile, schema, sitemap]\n- Conteúdo: [títulos, descrições, alt text, breadcrumbs]\n- Estrutura: [URLs, categorias, navegação, links internos]',
    is_active: true
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    system_prompt: '',
    guidelines_template: '',
    model: '',
    max_tokens: 2000,
    temperature: 0.5,
    analysis_type: 'technical',
    timeout: 30,
    max_images: 4
  });

  // Carregar agentes existentes
  useEffect(() => {
    loadAgents(); // Fixed: was calling loadBrands before
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agents');
      const result = await response.json();
      
      if (result.success) {
        setAgents(result.agents || []);
      } else {
        console.error('Erro ao carregar agentes:', result.message);
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções auxiliares para qualidade de análise
  const getAnalysisQualityLevel = () => {
    if (editFormData.max_tokens >= 2000 && editFormData.temperature <= 0.3) {
      return 'alta';
    } else if (editFormData.max_tokens >= 1000 && editFormData.temperature <= 0.7) {
      return 'media';
    } else {
      return 'baixa';
    }
  };

  const getAnalysisQualityDescription = () => {
    const level = getAnalysisQualityLevel();
    switch (level) {
      case 'alta':
        return 'Análise detalhada com alta precisão e contexto rico';
      case 'media':
        return 'Análise equilibrada entre velocidade e qualidade';
      case 'baixa':
        return 'Análise rápida e básica para uso geral';
      default:
        return 'Configuração personalizada';
    }
  };

  const updateAnalysisQuality = (quality: string) => {
    switch (quality) {
      case 'alta':
        setEditFormData(prev => ({
          ...prev,
          max_tokens: 2000,
          temperature: 0.3
        }));
        break;
      case 'media':
        setEditFormData(prev => ({
          ...prev,
          max_tokens: 1000,
          temperature: 0.7
        }));
        break;
      case 'baixa':
        setEditFormData(prev => ({
          ...prev,
          max_tokens: 500,
          temperature: 1.0
        }));
        break;
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditFormData({
      system_prompt: agent.system_prompt || '',
      guidelines_template: agent.guidelines_template || '',
      model: agent.model || '',
      max_tokens: agent.max_tokens || 2000,
      temperature: agent.temperature || 0.5,
      analysis_type: agent.analysis_type || 'technical',
      timeout: agent.timeout || 30,
      max_images: agent.max_images || 4
    });
    setShowEditModal(true);
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedAgent,
          system_prompt: editFormData.system_prompt,
          guidelines_template: editFormData.guidelines_template,
          model: editFormData.model,
          max_tokens: editFormData.max_tokens,
          temperature: editFormData.temperature,
          analysis_type: editFormData.analysis_type,
          timeout: editFormData.timeout,
          max_images: editFormData.max_images
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        alert(`Erro ${response.status}: ${errorText}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        alert('✅ Agente atualizado com sucesso!');
        setShowEditModal(false);
        setSelectedAgent(null);
        loadAgents(); // Recarregar a lista
      } else {
        console.error('❌ Erro na resposta:', result);
        alert('Erro ao atualizar agente: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar agente:', error);
      alert('Erro de conexão ao atualizar agente: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetEditForm = () => {
    setEditFormData({
      system_prompt: '',
      guidelines_template: '',
      model: '',
      max_tokens: 2000,
      temperature: 0.5,
      analysis_type: 'technical',
      timeout: 30,
      max_images: 4
    });
  };

  const getAgentTypeInfo = (functionType: string) => {
    return AGENT_TYPES[functionType as keyof typeof AGENT_TYPES] || {
      name: 'Agente Personalizado',
      description: 'Agente customizado',
      icon: Bot,
      color: 'gray'
    };
  };

  if (loading) {
    return (
      <Layout title="Agentes IA" subtitle="Gerenciando agentes de inteligência artificial">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Carregando agentes...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agentes IA" subtitle="Gerenciando agentes de inteligência artificial">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bot className="w-8 h-8 text-blue-600 mr-3" />
            Agentes de Inteligência Artificial
          </h1>
          <p className="text-gray-600 mt-1">
            Agentes pré-configurados e especializados
          </p>
        </div>


        {/* Lista de Agentes */}
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Agentes Disponíveis
            </h2>
            <p className="text-gray-600 mt-1">
              Agentes pré-configurados e prontos para uso
            </p>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agente disponível</h3>
              <p className="text-gray-500">Os agentes serão carregados automaticamente</p>
                </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => {
                const typeInfo = getAgentTypeInfo(agent.function_type);
                const IconComponent = typeInfo.icon;
                const colorClasses = {
                  purple: 'bg-purple-100 text-purple-600 border-purple-200',
                  blue: 'bg-blue-100 text-blue-600 border-blue-200',
                  yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
                  green: 'bg-green-100 text-green-600 border-green-200',
                  gray: 'bg-gray-100 text-gray-600 border-gray-200'
                };

                return (
                  <div
                    key={agent.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
                  >
                    {/* Header do Card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[typeInfo.color as keyof typeof colorClasses]}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          agent.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {agent.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Configurar agente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                </div>

                    {/* Conteúdo do Card */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{agent.description}</p>
                </div>

                    {/* Configurações do Agente */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Modelo:</span>
                        <span className="font-medium">{agent.model}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Tokens:</span>
                        <span className="font-medium">{agent.max_tokens}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Temperatura:</span>
                        <span className="font-medium">{agent.temperature}</span>
                      </div>
                </div>

                    {/* Tipo de Função */}
                    <div className="pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {typeInfo.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Modal de Edição */}
        {showEditModal && selectedAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Configurar Agente - {selectedAgent.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedAgent(null);
                      resetEditForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
              </div>

                <div className="space-y-6">
                  {/* Configurações Avançadas do Modelo */}
                  <div className="space-y-6">
                    {/* Seção: Configurações Básicas */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-blue-600" />
                        Configurações Básicas
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Modelo de IA
                          </label>
                          <select
                            value={editFormData.model}
                            onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="gpt-4o">GPT-4o (Recomendado)</option>
                            <option value="gpt-4o-mini">GPT-4o Mini (Econômico)</option>
                            <option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Modelo de IA utilizado pelo agente
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Tokens
                          </label>
                          <input
                            type="number"
                            value={editFormData.max_tokens}
                            onChange={(e) => setEditFormData({ ...editFormData, max_tokens: parseInt(e.target.value) || 2000 })}
                            min="100"
                            max="8000"
                            step="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Máximo de tokens por resposta
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperatura
                          </label>
                          <input
                            type="number"
                            value={editFormData.temperature}
                            onChange={(e) => setEditFormData({ ...editFormData, temperature: parseFloat(e.target.value) || 0.5 })}
                            min="0"
                            max="2"
                            step="0.1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Criatividade (0 = determinístico, 2 = muito criativo)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seção: Configurações de Análise */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Eye className="w-5 h-5 mr-2 text-green-600" />
                        Configurações de Análise
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Qualidade de Análise
                          </label>
                          <select
                            value={getAnalysisQualityLevel()}
                            onChange={(e) => updateAnalysisQuality(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="alta">Alta - Análise detalhada e completa</option>
                            <option value="media">Média - Análise equilibrada</option>
                            <option value="baixa">Baixa - Análise básica e rápida</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {getAnalysisQualityDescription()}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Análise
                          </label>
                          <select
                            value={editFormData.analysis_type || 'technical'}
                            onChange={(e) => setEditFormData({ ...editFormData, analysis_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="technical">Técnica - Foco em especificações</option>
                            <option value="commercial">Comercial - Foco em vendas</option>
                            <option value="creative">Criativa - Foco em storytelling</option>
                            <option value="balanced">Equilibrada - Combinação de abordagens</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Abordagem da análise de imagens
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seção: Configurações de Performance */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                        Configurações de Performance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timeout (segundos)
                          </label>
                          <input
                            type="number"
                            value={editFormData.timeout || 30}
                            onChange={(e) => setEditFormData({ ...editFormData, timeout: parseInt(e.target.value) || 30 })}
                            min="10"
                            max="120"
                            step="5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tempo limite para análise
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Máximo de Imagens
                          </label>
                          <input
                            type="number"
                            value={editFormData.max_images || 10}
                            onChange={(e) => setEditFormData({ ...editFormData, max_images: parseInt(e.target.value) || 10 })}
                            min="1"
                            max="20"
                            step="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Máximo de imagens por análise
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt
                </label>
                <textarea
                      value={editFormData.system_prompt}
                      onChange={(e) => setEditFormData({ ...editFormData, system_prompt: e.target.value })}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Digite o prompt do sistema que define o comportamento do agente..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Este prompt define como o agente deve se comportar e responder
                    </p>
              </div>

                  {/* Guidelines Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template de Diretrizes
                </label>
                <textarea
                      value={editFormData.guidelines_template}
                      onChange={(e) => setEditFormData({ ...editFormData, guidelines_template: e.target.value })}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Template de diretrizes opcionais para personalizar o comportamento..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Template com placeholders que pode ser personalizado para cada uso
                    </p>
              </div>

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedAgent(null);
                        resetEditForm();
                      }}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                <button
                      onClick={handleUpdateAgent}
                  disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                    </>
                  )}
                </button>
              </div>
                </div>
              </div>
              </div>
            </div>
        )}

      </div>
    </Layout>
  );
}
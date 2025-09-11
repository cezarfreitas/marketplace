'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import { Settings, Key, Globe, Database, Eye, EyeOff, FileText, Trash2, AlertTriangle } from 'lucide-react';

interface EnvConfig {
  database: {
    host: string;
    port: string;
    name: string;
    user: string;
    password: string;
  };
  vtex: {
    accountName: string;
    environment: string;
    appKey: string;
    appToken: string;
  };
  openai: {
    apiKey: string;
    organization: string;
  };
  anymarket: {
    token: string;
    apiUrl: string;
  };
  system: {
    nodeEnv: string;
    nextAuthSecret: string;
    nextAuthUrl: string;
  };
  other: Record<string, string>;
}

export default function SettingsPage() {
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [showSensitiveValues, setShowSensitiveValues] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Carregar configurações do .env
  const loadEnvConfig = async () => {
    setLoadingEnv(true);
    try {
      const response = await fetch('/api/settings/env-config');
      const data = await response.json();
      
      if (data.success) {
        setEnvConfig(data.data);
      } else {
        console.error('Erro ao carregar configurações do .env:', data.message);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do .env:', error);
    } finally {
      setLoadingEnv(false);
    }
  };

  // Limpar todos os dados de produtos e itens relacionados
  const clearAllProductData = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }

    setClearingData(true);
    try {
      const response = await fetch('/api/admin/clear-all-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Todos os dados foram limpos com sucesso!');
        setClearConfirm(false);
      } else {
        alert(`❌ Erro ao limpar dados: ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      alert('❌ Erro ao limpar dados. Verifique o console para mais detalhes.');
    } finally {
      setClearingData(false);
    }
  };


  return (
    <Layout title="Configurações" subtitle="Visualizar configurações do arquivo .env">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Configurações do Arquivo .env */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Configurações do .env</h2>
                <p className="text-gray-600">Visualizar configurações atuais do arquivo de ambiente</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSensitiveValues(!showSensitiveValues)}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                title={showSensitiveValues ? 'Ocultar valores sensíveis' : 'Mostrar valores sensíveis'}
              >
                {showSensitiveValues ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showSensitiveValues ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                onClick={loadEnvConfig}
                disabled={loadingEnv}
                className="btn-secondary text-sm"
              >
                {loadingEnv ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          {envConfig ? (
            <div className="space-y-6">
              {/* Banco de Dados */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-gray-600" />
                  Banco de Dados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.database.host}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.database.port}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Banco</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.database.name}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.database.user}</code>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.DB_PASSWORD || 'Não configurado' : envConfig.database.password}
                    </code>
                  </div>
                </div>
              </div>

              {/* VTEX */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-purple-600" />
                  Configurações VTEX
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conta</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.vtex.accountName}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.vtex.environment}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Key</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.VTEX_APP_KEY || 'Não configurado' : envConfig.vtex.appKey}
                    </code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Token</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.VTEX_APP_TOKEN || 'Não configurado' : envConfig.vtex.appToken}
                    </code>
                  </div>
                </div>
              </div>

              {/* OpenAI */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Key className="h-5 w-5 mr-2 text-green-600" />
                  Configurações OpenAI
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.OPENAI_API_KEY || 'Não configurado' : envConfig.openai.apiKey}
                    </code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organização</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.openai.organization}</code>
                  </div>
                </div>
              </div>

              {/* Anymarket */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-yellow-600" />
                  Configurações Anymarket
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.ANYMARKET_TOKEN || 'Não configurado' : envConfig.anymarket.token}
                    </code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL da API</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.anymarket.apiUrl}</code>
                  </div>
                </div>
              </div>

              {/* Sistema */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Configurações do Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente Node</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.system.nodeEnv}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NextAuth URL</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm">{envConfig.system.nextAuthUrl}</code>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">NextAuth Secret</label>
                    <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                      {showSensitiveValues ? process.env.NEXTAUTH_SECRET || 'Não configurado' : envConfig.system.nextAuthSecret}
                    </code>
                  </div>
                </div>
              </div>

              {/* Limpeza de Dados */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Trash2 className="h-5 w-5 mr-2 text-red-600" />
                  Limpeza de Dados
                </h3>
                <div className="space-y-4">
                  <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Ação Irreversível</h4>
                        <p className="text-sm text-red-700 mb-3">
                          Esta operação irá apagar <strong>TODOS</strong> os dados relacionados a produtos, incluindo:
                        </p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-4">
                          <li>Produtos VTEX</li>
                          <li>SKUs e variações</li>
                          <li>Imagens dos produtos</li>
                          <li>Análises de imagem</li>
                          <li>Descrições do marketplace</li>
                          <li>Características e respostas</li>
                          <li>Estoque</li>
                          <li>Sincronizações Anymarket</li>
                        </ul>
                        <p className="text-sm font-medium text-red-800">
                          Esta ação <strong>NÃO PODE</strong> ser desfeita!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {!clearConfirm ? (
                      <button
                        onClick={clearAllProductData}
                        disabled={clearingData}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {clearingData ? 'Limpando...' : 'Limpar Todos os Dados'}
                      </button>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={clearAllProductData}
                          disabled={clearingData}
                          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {clearingData ? 'Confirmando...' : 'Confirmar Limpeza'}
                        </button>
                        <button
                          onClick={() => setClearConfirm(false)}
                          disabled={clearingData}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Outras configurações sensíveis */}
              {Object.keys(envConfig.other).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Key className="h-5 w-5 mr-2 text-gray-600" />
                    Outras Configurações Sensíveis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(envConfig.other).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                        <code className="block bg-white px-3 py-2 rounded border text-sm font-mono">
                          {showSensitiveValues ? process.env[key] || 'Não configurado' : value}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Configurações não carregadas</h3>
              <p className="text-gray-500 mb-4">Clique em &quot;Atualizar&quot; para carregar as configurações do arquivo .env</p>
              <button
                onClick={loadEnvConfig}
                disabled={loadingEnv}
                className="btn-primary"
              >
                {loadingEnv ? 'Carregando...' : 'Carregar Configurações'}
              </button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

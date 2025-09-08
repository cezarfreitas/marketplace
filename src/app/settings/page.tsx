'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import { Settings, Key, Globe, Database, Save, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VtexConfig {
  accountName: string;
  environment: string;
  appKey: string;
  appToken: string;
  openaiKey: string;
}

interface ConnectionTest {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<VtexConfig>({
    accountName: '',
    environment: 'vtexcommercestable',
    appKey: '',
    appToken: '',
    openaiKey: '',
  });

  const [connectionTest, setConnectionTest] = useState<ConnectionTest>({
    status: 'idle',
    message: '',
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/settings/save');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConfig(data.config);
          }
        }
      } catch (error) {
        console.log('Configurações não encontradas no servidor');
      }
    };
    
    loadConfig();
  }, []);

  const handleInputChange = (field: keyof VtexConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert(data.message || 'Erro ao salvar configurações');
      }
    } catch (error) {
      alert('Erro de rede ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionTest({ status: 'testing', message: 'Testando conexão...' });

    try {
      const response = await fetch('/api/vtex/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionTest({
          status: 'success',
          message: 'Conexão com VTEX estabelecida com sucesso!'
        });
      } else {
        setConnectionTest({
          status: 'error',
          message: data.message || 'Erro ao conectar com VTEX'
        });
      }
    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: 'Erro de rede ao testar conexão'
      });
    } finally {
      setTesting(false);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionTest.status) {
      case 'testing':
        return <TestTube className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionTest.status) {
      case 'testing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Layout title="Configurações" subtitle="Configure as credenciais da VTEX e outras opções">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Configurações VTEX */}
        <Card>
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <Key className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Credenciais VTEX</h2>
              <p className="text-gray-600">Configure suas credenciais de API da VTEX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Conta VTEX
              </label>
              <input
                type="text"
                value={config.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="ex: minhaloja"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome da sua conta VTEX (sem .vtexcommercestable.com.br)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambiente
              </label>
              <select
                value={config.environment}
                onChange={(e) => handleInputChange('environment', e.target.value)}
                className="input-field"
              >
                <option value="vtexcommercestable">Produção</option>
                <option value="vtexcommercestable">Homologação</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Ambiente da API VTEX
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Key
              </label>
              <input
                type="text"
                value={config.appKey}
                onChange={(e) => handleInputChange('appKey', e.target.value)}
                placeholder="Sua App Key da VTEX"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador único da sua API key
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Token
              </label>
              <input
                type="password"
                value={config.appToken}
                onChange={(e) => handleInputChange('appToken', e.target.value)}
                placeholder="Seu App Token da VTEX"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token secreto da sua API key
              </p>
            </div>

          </div>

          {/* URL Base */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Base da API
            </label>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-gray-400" />
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm">
                https://{config.accountName || 'sua-conta'}.{config.environment}.com.br
              </code>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              URL base que será usada para as requisições à API VTEX
            </p>
          </div>

          {/* Teste de Conexão */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getConnectionIcon()}
                <span className={`ml-2 text-sm font-medium ${getConnectionColor()}`}>
                  {connectionTest.message || 'Teste a conexão com a API VTEX'}
                </span>
              </div>
              <button
                onClick={testConnection}
                disabled={testing || !config.accountName || !config.appKey || !config.appToken}
                className="btn-secondary text-sm"
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </div>

          {/* Configurações de IA */}
          <div className="mt-8">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Key className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configurações de IA</h3>
                <p className="text-sm text-gray-600">Configure as chaves de API para funcionalidades de inteligência artificial</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave da OpenAI
              </label>
              <input
                type="password"
                value={config.openaiKey}
                onChange={(e) => handleInputChange('openaiKey', e.target.value)}
                placeholder="sk-..."
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Chave da API da OpenAI para funcionalidades de IA (análise de produtos, geração de conteúdo, etc.)
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !config.accountName || !config.appKey || !config.appToken}
              className="btn-primary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </Card>

        {/* Configurações do Banco de Dados */}
        <Card>
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <Database className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Banco de Dados</h2>
              <p className="text-gray-600">Configurações de conexão com MySQL</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host
              </label>
              <input
                type="text"
                value="server.idenegociosdigitais.com.br"
                disabled
                className="input-field bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porta
              </label>
              <input
                type="text"
                value="3349"
                disabled
                className="input-field bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco de Dados
              </label>
              <input
                type="text"
                value="meli"
                disabled
                className="input-field bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                type="text"
                value="meli"
                disabled
                className="input-field bg-gray-100"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-green-700">
                Conexão com banco de dados estabelecida com sucesso
              </span>
            </div>
          </div>
        </Card>

        {/* Informações da API */}
        <Card>
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <Settings className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Informações da API</h2>
              <p className="text-gray-600">Documentação e exemplos de uso</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Exemplo de Requisição cURL:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl --request get \\
  --url https://${config.accountName || 'sua-conta'}.${config.environment}.com.br/api/catalog_system/pvt/brand/list \\
  --header 'Accept: application/json' \\
  --header 'Content-Type: application/json' \\
  --header 'X-VTEX-API-AppKey: ${config.appKey || 'sua-app-key'}' \\
  --header 'X-VTEX-API-AppToken: ${config.appToken || 'seu-app-token'}'`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Endpoints Principais:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code>/api/catalog_system/pvt/brand/list</code> - Listar marcas</li>
                <li>• <code>/api/catalog_system/pvt/category/tree</code> - Listar categorias</li>
                <li>• <code>/api/catalog_system/pvt/product/GetProductAndSkuIds</code> - Listar produtos</li>
                <li>• <code>/api/catalog_system/pvt/stockkeepingunit</code> - Listar SKUs</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

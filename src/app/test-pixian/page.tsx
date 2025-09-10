'use client';

import { useState } from 'react';
import Card from '@/components/Card';

export default function TestPixianPage() {
  const [imageUrl, setImageUrl] = useState('https://projetoinfluencer.vteximg.com.br/arquivos/ids/5287720/Viseira-HD-Aba-Curva-Preta_638358924397754864.jpg');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Token de autorização do Pixian.ai
  const pixianToken = 'Basic cHhnbmNzZm5hZHpqNGZiOmJnczNjcDM4bzVjdTlrY2FuOTI0ZDZyMDF0b2ZrbTAwc3R1ZWw5N3RndXRyMXVyYzdxZm4=';
  
  // Parâmetros customizáveis
  const [params, setParams] = useState({
    'background.color': '#FFFFFF',
    'result.crop_to_foreground': 'true',
    'result.target_size': '1500 1500',
    'result.vertical_alignment': 'middle',
    'output.format': 'jpeg',
    'output.jpeg_quality': '90',
    'result.margin': '0px 150px 0px 150px'
  });

  const handleTest = async () => {
    if (!imageUrl.trim()) {
      setError('URL da imagem é obrigatória');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-pixian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          testParams: params
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (key: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setParams({
      'background.color': '#FFFFFF',
      'result.crop_to_foreground': 'true',
      'result.target_size': '1500 1500',
      'result.vertical_alignment': 'middle',
      'output.format': 'jpeg',
      'output.jpeg_quality': '90',
      'result.margin': '0px 150px 0px 150px'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 Teste Pixian.ai
        </h1>
        <p className="text-gray-600">
          Teste a integração com a API do Pixian.ai para remoção de fundo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">⚙️ Configurações</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Imagem
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Parâmetros do Pixian
                </label>
                <button
                  onClick={resetToDefaults}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Resetar Padrões
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    background.color
                  </label>
                  <input
                    type="text"
                    value={params['background.color']}
                    onChange={(e) => handleParamChange('background.color', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    result.target_size
                  </label>
                  <input
                    type="text"
                    value={params['result.target_size']}
                    onChange={(e) => handleParamChange('result.target_size', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    result.margin
                  </label>
                  <input
                    type="text"
                    value={params['result.margin']}
                    onChange={(e) => handleParamChange('result.margin', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    output.jpeg_quality
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={params['output.jpeg_quality']}
                    onChange={(e) => handleParamChange('output.jpeg_quality', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleTest}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Processando...' : '🚀 Testar Pixian.ai'}
            </button>
          </div>
        </Card>

        {/* Resultados */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">📊 Resultados</h2>
          
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processando imagem no Pixian.ai...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-medium">❌ Erro</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-green-800 font-medium">✅ Sucesso</h3>
                <div className="text-green-700 text-sm mt-2 space-y-1">
                  <p><strong>Tempo de processamento:</strong> {result.processingTime}ms</p>
                  <p><strong>Tamanho processado:</strong> {result.processedSize.toLocaleString()} bytes</p>
                  <p><strong>Método:</strong> JSON (formato curl)</p>
                </div>
              </div>

              {result.processedImage && (
                <div>
                  <h3 className="font-medium mb-2">🖼️ Imagem Processada</h3>
                  <div className="border border-gray-200 rounded-md p-2">
                    <img
                      src={result.processedImage}
                      alt="Imagem processada"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                  
                  <div className="mt-2">
                    <a
                      href={result.processedImage}
                      download="pixian-processed.jpg"
                      className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      📥 Baixar Imagem
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && !result && (
            <div className="text-center py-8 text-gray-500">
              <p>Configure os parâmetros e clique em &quot;Testar Pixian.ai&quot; para começar</p>
            </div>
          )}
        </Card>
      </div>

      {/* Token de Autorização */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">🔑 Token de Autorização</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authorization Header
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={pixianToken}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(pixianToken)}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                📋 Copiar
              </button>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm">
              <strong>⚠️ Importante:</strong> Este token é usado para autenticação com a API do Pixian.ai. 
              Mantenha-o seguro e não compartilhe publicamente.
            </p>
          </div>
        </div>
      </Card>

      {/* Informações da API */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">📚 Informações da API</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Endpoint:</h3>
            <code className="bg-gray-100 px-2 py-1 rounded">POST /api/test-pixian</code>
          </div>
          <div>
            <h3 className="font-medium mb-2">Parâmetros:</h3>
            <ul className="text-gray-600 space-y-1">
              <li>• imageUrl (obrigatório)</li>
              <li>• testParams (opcional)</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="font-medium mb-2">🔗 URL da API Pixian:</h3>
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            https://api.pixian.ai/api/v2/remove-background
          </code>
        </div>
      </Card>
    </div>
  );
}

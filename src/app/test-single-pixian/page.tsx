'use client';

import { useState } from 'react';

export default function TestSinglePixian() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-single-pixian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Teste Isolado - Pixian.ai</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Imagem de Teste:</h2>
        <p className="text-sm text-gray-600 mb-2">
          https://projetoinfluencer.vteximg.com.br/arquivos/ids/5287720/Viseira-HD-Aba-Curva-Preta_638358924397754864.jpg
        </p>
        <img 
          src="https://projetoinfluencer.vteximg.com.br/arquivos/ids/5287720/Viseira-HD-Aba-Curva-Preta_638358924397754864.jpg"
          alt="Imagem original"
          className="max-w-xs rounded-lg shadow-md"
        />
      </div>

      <button
        onClick={handleTest}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processando...' : 'Processar com Pixian.ai'}
      </button>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Erro:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-semibold mb-2">✅ Sucesso!</h3>
            <p className="text-green-600">Imagem processada e salva com sucesso!</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-semibold mb-2">📊 Detalhes:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Arquivo:</strong> {result.fileName}</p>
              <p><strong>Tamanho:</strong> {result.fileSize} bytes</p>
              <p><strong>HTTP Acessível:</strong> {result.httpAccessible ? '✅ Sim' : '❌ Não'}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-semibold mb-2">🔗 URLs:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Original:</strong> <a href={result.originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{result.originalUrl}</a></p>
              <p><strong>Processada:</strong> <a href={result.processedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{result.processedUrl}</a></p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-semibold mb-2">🖼️ Imagem Processada:</h3>
            <div className="flex space-x-4">
              <div>
                <p className="text-sm font-medium mb-2">Original:</p>
                <img 
                  src={result.originalUrl}
                  alt="Original"
                  className="w-48 h-48 object-cover rounded-lg shadow-md"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Processada:</p>
                <img 
                  src={result.processedUrl}
                  alt="Processada"
                  className="w-48 h-48 object-cover rounded-lg shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.png';
                    e.currentTarget.alt = 'Imagem não carregada';
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-semibold mb-2">📋 Payload Pixian.ai:</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(result.pixianPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

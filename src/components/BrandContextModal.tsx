'use client';

import React, { useState, useEffect } from 'react';
import { X, Bot, Loader2, Save, Copy, RefreshCw } from 'lucide-react';

interface Brand {
  id: number;
  name: string;
  title?: string;
  meta_tag_description?: string;
  image_url?: string;
  contexto?: string;
}

interface BrandContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  onContextGenerated: (brandId: number, context: string) => void;
}

export function BrandContextModal({ isOpen, onClose, brand, onContextGenerated }: BrandContextModalProps) {
  const [brandDescription, setBrandDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContext, setGeneratedContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Carregar contexto existente quando o modal abrir
  useEffect(() => {
    if (brand?.contexto && brand.contexto.trim()) {
      setGeneratedContext(brand.contexto);
    } else {
      setGeneratedContext('');
    }
  }, [brand]);

  if (!isOpen || !brand) return null;

  const handleGenerateContext = async () => {
    if (!brandDescription.trim()) {
      alert('Por favor, descreva a marca antes de gerar o contexto.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/brands/generate-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: brand.id,
          brandName: brand.name,
          brandDescription: brandDescription,
          existingInfo: {
            title: brand.title,
            description: brand.meta_tag_description
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContext(result.data.context);
      } else {
        alert('Erro ao gerar contexto: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao gerar contexto:', error);
      alert('Erro ao gerar contexto. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContext = async () => {
    if (!generatedContext.trim()) {
      alert('Nenhum contexto gerado para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/brands/${brand.id}/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contexto: generatedContext
        }),
      });

      const result = await response.json();

      if (result.success) {
        onContextGenerated(brand.id, generatedContext);
        onClose();
        setGeneratedContext('');
        setBrandDescription('');
      } else {
        alert('Erro ao salvar contexto: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao salvar contexto:', error);
      alert('Erro ao salvar contexto. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyContext = () => {
    navigator.clipboard.writeText(generatedContext);
    alert('Contexto copiado para a área de transferência!');
  };

  const handleReset = () => {
    setBrandDescription('');
    setGeneratedContext('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                brand.contexto && brand.contexto.trim() 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Contexto de Marca</h2>
                <p className="text-sm text-gray-600">
                  {brand.name}
                  {brand.contexto && brand.contexto.trim() && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Contexto existente
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Descreva a marca
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Informe: histórico, público-alvo, produtos, tom de voz e valores da marca
                </p>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder="Ex: Nike é marca esportiva americana fundada em 1964, focada em jovens e adultos de 16-45 anos que praticam esportes. Oferece calçados, roupas e equipamentos esportivos com tecnologia avançada. Usa tom motivacional e inspirador, valorizando inovação e performance..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                />
              </div>

              <button
                onClick={handleGenerateContext}
                disabled={isGenerating || !brandDescription.trim()}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    {brand.contexto && brand.contexto.trim() ? 'Regenerar Contexto' : 'Gerar Contexto'}
                  </>
                )}
              </button>
            </div>

            {/* Output Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800">
                  Contexto da marca
                </label>
                {generatedContext && (
                  <div className="flex space-x-1">
                    <button
                      onClick={handleCopyContext}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Copiar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Limpar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {generatedContext ? (
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm h-80 overflow-y-auto">
                  <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {generatedContext}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center h-80 flex flex-col items-center justify-center">
                  <Bot className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">Contexto será gerado aqui</p>
                </div>
              )}

              {generatedContext && (
                <button
                  onClick={handleSaveContext}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Contexto
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

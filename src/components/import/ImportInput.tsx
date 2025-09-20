import { ImportConfig as ImportConfigType } from '@/hooks/useImportState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef, useEffect } from 'react';

interface ImportInputProps {
  refIds: string;
  config: ImportConfigType;
  progressStatus: string;
  onRefIdsChange: (refIds: string) => void;
  onImport: () => void;
}

export const ImportInput = ({ 
  refIds, 
  config, 
  progressStatus,
  onRefIdsChange, 
  onImport
}: ImportInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const refIdList = refIds.split('\n').filter(id => id.trim());
  const productCount = refIdList.length;
  const isEmpty = productCount === 0;
  const exceedsLimit = productCount > 200;

  const handleRemoveRefId = (indexToRemove: number) => {
    const newRefIdList = refIdList.filter((_, index) => index !== indexToRemove);
    onRefIdsChange(newRefIdList.join('\n'));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Detectar quando uma linha completa foi digitada (terminada com Enter)
    const lines = value.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // Se a última linha não está vazia e não estamos compondo (para caracteres especiais)
    if (lastLine.trim() && !isComposing) {
      // Verificar se parece um RefID (alfanumérico, pelo menos 8 caracteres)
      if (lastLine.trim().length >= 8 && /^[A-Z0-9]+$/i.test(lastLine.trim())) {
        // Processar usando a função que remove duplicados
        const processed = processInputText(lastLine.trim());
        if (processed) {
          // Limpar o input
          setInputValue('');
          
          // Focar novamente no textarea
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 0);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue.trim();
      if (value) {
        const processed = processInputText(value);
        if (processed) {
          setInputValue('');
        }
      }
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length > 0) {
      // Filtrar apenas linhas que parecem RefIDs
      const validRefIds = lines.filter(line => 
        line.length >= 8 && /^[A-Z0-9]+$/i.test(line)
      );
      
      if (validRefIds.length > 0) {
        // Obter RefIDs únicos (sem duplicados)
        const currentRefIds = refIds ? refIds.split('\n').filter(id => id.trim()) : [];
        const allRefIds = [...currentRefIds, ...validRefIds];
        const uniqueRefIds = Array.from(new Set(allRefIds)); // Remove duplicados
        
        onRefIdsChange(uniqueRefIds.join('\n'));
        setInputValue(''); // Limpar o input após colar
      }
    }
  };

  const processInputText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const validRefIds = lines.filter(line => 
      line.length >= 8 && /^[A-Z0-9]+$/i.test(line)
    );
    
    if (validRefIds.length > 0) {
      const currentRefIds = refIds ? refIds.split('\n').filter(id => id.trim()) : [];
      const allRefIds = [...currentRefIds, ...validRefIds];
      const uniqueRefIds = Array.from(new Set(allRefIds)); // Remove duplicados
      
      onRefIdsChange(uniqueRefIds.join('\n'));
      return true; // Indica que processou RefIDs
    }
    return false;
  };

  return (
    <div className="bg-white hover:shadow-lg transition-shadow rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">RefIds dos Produtos</h2>
      </div>

      <div className="space-y-6">
        {/* Textarea com labels inline */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">📝 RefIds dos Produtos</Label>
          <div className="relative">
            <div className="min-h-[200px] border border-gray-300 rounded-lg bg-white p-3 overflow-y-auto">
              {/* Labels dos RefIDs já adicionados */}
              {refIdList.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {refIdList.map((refId, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1 text-sm font-mono"
                    >
                      <span className="text-gray-800">{refId}</span>
                      <button
                        onClick={() => handleRemoveRefId(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Contador - Parte superior */}
              <div className="absolute top-2 right-2">
                <div className="bg-gray-100 rounded-lg px-3 py-1 shadow-sm border border-gray-200">
                  <span className={`text-xs font-medium ${exceedsLimit ? 'text-red-600' : 'text-gray-700'}`}>
                    {productCount}/200 produtos
                  </span>
                </div>
              </div>
              
              {/* Input para novos RefIDs */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={refIdList.length === 0 ? "Digite um RefId e pressione Enter ou cole múltiplos (ex: ECKCAMM153041P)" : "Digite o próximo RefId ou cole mais..."}
                className="w-full font-mono text-sm bg-transparent text-gray-900 placeholder:text-gray-500 border-none outline-none resize-none"
                rows={4}
                style={{ minHeight: '60px' }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-600">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Digite RefIds e pressione Enter, ou cole múltiplos (um por linha). Duplicados são removidos automaticamente.
            </div>
            {productCount > 0 && (
              <button
                onClick={() => {
                  onRefIdsChange('');
                  setInputValue('');
                }}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Limpar todos
              </button>
            )}
          </div>
        </div>

        {/* Mensagem de erro quando exceder limite */}
        {exceedsLimit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">
                <strong>Limite excedido:</strong> Máximo de 200 produtos por importação. Use múltiplas chamadas para mais produtos. Você tem {productCount} produtos.
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onImport}
          disabled={progressStatus === 'running' || isEmpty || exceedsLimit}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed border border-gray-700 disabled:border-gray-300 flex items-center justify-center"
        >
          {progressStatus === 'running' ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importando Dados Completos...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Iniciar Importação Completa
            </>
          )}
        </button>


      </div>
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, FileSpreadsheet, Eye } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (idAnyColumn: string, refIdColumn: string) => void;
  fileData: {
    headers: string[];
    previewData: any[];
    autoMapping: {
      idAny: number | null;
      refId: number | null;
    };
    fileInfo: {
      name: string;
      size: number;
      type: string;
    };
  } | null;
  processing: boolean;
}

export default function ColumnMappingModal({
  isOpen,
  onClose,
  onProcess,
  fileData,
  processing
}: ColumnMappingModalProps) {
  const [idAnyColumn, setIdAnyColumn] = useState<string>('');
  const [refIdColumn, setRefIdColumn] = useState<string>('');

  useEffect(() => {
    if (fileData && isOpen) {
      // Aplicar mapeamento automático se disponível
      if (fileData.autoMapping.idAny !== null) {
        setIdAnyColumn(fileData.headers[fileData.autoMapping.idAny]);
      }
      if (fileData.autoMapping.refId !== null) {
        setRefIdColumn(fileData.headers[fileData.autoMapping.refId]);
      }
    }
  }, [fileData, isOpen]);

  const handleProcess = () => {
    if (idAnyColumn && refIdColumn) {
      onProcess(idAnyColumn, refIdColumn);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !fileData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Mapear Colunas do Arquivo</h2>
                <p className="text-sm text-gray-600">Selecione quais colunas correspondem ao Anymarket e VTEX</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{fileData.fileInfo.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatFileSize(fileData.fileInfo.size)} • {fileData.headers.length} colunas • {fileData.previewData.length} linhas de preview
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Tipo: {fileData.fileInfo.type}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column Mapping */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mapeamento de Colunas</h3>
              
              <div className="space-y-6">
                {/* Anymarket Mapping */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <label className="text-sm font-semibold text-blue-900">
                      🛒 Anymarket
                    </label>
                  </div>
                  <select
                    value={idAnyColumn}
                    onChange={(e) => setIdAnyColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    disabled={processing}
                  >
                    <option value="">Selecione a coluna do Anymarket</option>
                    {fileData.headers.map((header, index) => (
                      <option key={index} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-700 mt-1">
                    Identificador único do produto no Anymarket
                  </p>
                </div>

                {/* VTEX Mapping */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <label className="text-sm font-semibold text-green-900">
                      🏪 VTEX
                    </label>
                  </div>
                  <select
                    value={refIdColumn}
                    onChange={(e) => setRefIdColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    disabled={processing}
                  >
                    <option value="">Selecione a coluna do VTEX</option>
                    {fileData.headers.map((header, index) => (
                      <option key={index} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-green-700 mt-1">
                    Referência do produto na VTEX
                  </p>
                </div>
              </div>

              {/* Auto Mapping Suggestions */}
              {fileData.autoMapping.idAny !== null || fileData.autoMapping.refId !== null ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Check className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Mapeamento Automático Detectado</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {fileData.autoMapping.idAny !== null && (
                      <p>• 🛒 Anymarket: {fileData.headers[fileData.autoMapping.idAny]}</p>
                    )}
                    {fileData.autoMapping.refId !== null && (
                      <p>• 🏪 VTEX: {fileData.headers[fileData.autoMapping.refId]}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Mapeamento Manual Necessário</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Não foi possível detectar automaticamente as colunas. Selecione manualmente.
                  </p>
                </div>
              )}
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Preview dos Dados
              </h3>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        {fileData.headers.map((header, index) => (
                          <th
                            key={index}
                            className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                              header === idAnyColumn 
                                ? 'bg-blue-100 text-blue-800' 
                                : header === refIdColumn
                                ? 'bg-green-100 text-green-800'
                                : 'text-gray-500'
                            }`}
                          >
                            {header}
                            {header === idAnyColumn && (
                              <span className="ml-1 text-blue-600 font-bold">(🛒 Anymarket)</span>
                            )}
                            {header === refIdColumn && (
                              <span className="ml-1 text-green-600 font-bold">(🏪 VTEX)</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fileData.previewData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {row.rowIndex}
                          </td>
                          {fileData.headers.map((header, colIndex) => (
                            <td
                              key={colIndex}
                              className={`px-3 py-2 whitespace-nowrap text-sm ${
                                header === idAnyColumn 
                                  ? 'bg-blue-50 text-blue-900 font-medium' 
                                  : header === refIdColumn
                                  ? 'bg-green-50 text-green-900 font-medium'
                                  : 'text-gray-900'
                              }`}
                            >
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcess}
              disabled={!idAnyColumn || !refIdColumn || processing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Importando Dados...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Importar para Anymarket</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

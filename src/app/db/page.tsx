'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Database, 
  Search, 
  RefreshCw,
  XCircle
} from 'lucide-react';

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  column_key: string;
  extra: string;
  column_comment: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}


interface TableInfo {
  table_name: string;
  table_rows: number;
  data_length: number;
  index_length: number;
  create_time: string;
  update_time: string;
  table_comment: string | null;
  columns: Column[];
  column_count: number;
}

interface DatabaseInfo {
  total_tables: number;
  total_columns: number;
}

interface DatabaseStructure {
  database_info: DatabaseInfo;
  tables: TableInfo[];
}

export default function DatabasePage() {
  const [databaseStructure, setDatabaseStructure] = useState<DatabaseStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDatabaseStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/db/tables');
      const result = await response.json();
      
      if (result.success) {
        setDatabaseStructure(result.data);
        console.log('✅ Estrutura do banco carregada:', result.data);
      } else {
        setError(result.message || 'Erro ao carregar estrutura do banco');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com a API');
      console.error('❌ Erro ao carregar estrutura do banco:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStructure();
  }, []);


  const filteredTables = databaseStructure?.tables.filter(table =>
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.column_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];


  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando estrutura do banco de dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadDatabaseStructure} variant="outline" className="border-red-300 text-red-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estrutura do Banco de Dados</h1>
            <p className="text-gray-600">Visualize todas as tabelas, colunas e relacionamentos</p>
          </div>
        </div>
        <Button onClick={loadDatabaseStructure} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Busca Simples */}
      <div className="flex items-center space-x-2 mb-6">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar tabelas ou colunas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Lista de Tabelas */}
      <div className="space-y-4">
        {filteredTables.map((table) => (
          <div key={table.table_name} className="border rounded-lg p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Tabela: <span className="font-semibold">{table.table_name}</span>
              </p>
              <p className="text-sm text-gray-700">
                Colunas: {table.columns.map((column, index) => (
                  <span key={index}>
                    {column.column_name}
                    {index < table.columns.length - 1 && ', '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma tabela encontrada</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Tente ajustar os termos de busca.' : 'Não há tabelas no banco de dados.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

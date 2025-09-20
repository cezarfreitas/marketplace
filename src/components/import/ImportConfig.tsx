import { ImportConfig as ImportConfigType } from '@/hooks/useImportState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ImportConfigProps {
  batchSize: number;
  config: ImportConfigType;
  onBatchSizeChange: (batchSize: number) => void;
  onConfigChange: (config: Partial<ImportConfigType>) => void;
}

export const ImportConfig = ({ 
  batchSize, 
  config, 
  onBatchSizeChange, 
  onConfigChange 
}: ImportConfigProps) => {
  return (
    <div className="bg-white hover:shadow-lg transition-shadow rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Layout horizontal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        {/* Título */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Configurações</h2>
        </div>

        {/* Controles em linha horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Tamanho do Lote */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">📊 Tamanho do Lote:</Label>
            <Select value={batchSize.toString()} onValueChange={(value) => onBatchSizeChange(Number(value))}>
              <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 produtos</SelectItem>
                <SelectItem value="10">10 produtos</SelectItem>
                <SelectItem value="15">15 produtos</SelectItem>
                <SelectItem value="20">20 produtos (recomendado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switch para pular produtos existentes */}
          <div className="flex items-center gap-3">
            <Switch
              id="skip-existing"
              checked={config.skipExisting}
              onCheckedChange={(checked) => onConfigChange({ skipExisting: checked })}
            />
            <Label htmlFor="skip-existing" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Pular produtos existentes
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

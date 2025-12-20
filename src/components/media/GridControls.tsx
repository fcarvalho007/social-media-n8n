import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GridConfig } from '@/types/grid-splitter';
import { Sparkles, Grid3x3 } from 'lucide-react';

interface GridControlsProps {
  detectionMode: 'auto' | 'manual';
  onDetectionModeChange: (mode: 'auto' | 'manual') => void;
  manualConfig: GridConfig;
  onManualConfigChange: (config: GridConfig) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  removeBorders: boolean;
  onRemoveBordersChange: (value: boolean) => void;
  disabled?: boolean;
}

export function GridControls({
  detectionMode,
  onDetectionModeChange,
  manualConfig,
  onManualConfigChange,
  sensitivity,
  onSensitivityChange,
  removeBorders,
  onRemoveBordersChange,
  disabled = false,
}: GridControlsProps) {
  const isAutoMode = detectionMode === 'auto';

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Auto Detection Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label htmlFor="auto-detect" className="text-sm font-medium cursor-pointer">
            Deteção Automática
          </Label>
        </div>
        <Switch
          id="auto-detect"
          checked={isAutoMode}
          onCheckedChange={(checked) => onDetectionModeChange(checked ? 'auto' : 'manual')}
          disabled={disabled || true} // Disabled in Phase 1
        />
      </div>

      {/* Auto mode note */}
      {isAutoMode && (
        <p className="text-xs text-muted-foreground italic">
          Deteção automática será implementada na Fase 2
        </p>
      )}

      {/* Manual Config - Rows/Cols Selectors */}
      {!isAutoMode && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rows" className="text-xs text-muted-foreground flex items-center gap-1">
              <Grid3x3 className="h-3 w-3" />
              Linhas
            </Label>
            <Select
              value={manualConfig.rows.toString()}
              onValueChange={(value) => onManualConfigChange({ ...manualConfig, rows: parseInt(value) })}
              disabled={disabled}
            >
              <SelectTrigger id="rows" className="h-9">
                <SelectValue placeholder="Linhas" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? 'linha' : 'linhas'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cols" className="text-xs text-muted-foreground flex items-center gap-1">
              <Grid3x3 className="h-3 w-3 rotate-90" />
              Colunas
            </Label>
            <Select
              value={manualConfig.cols.toString()}
              onValueChange={(value) => onManualConfigChange({ ...manualConfig, cols: parseInt(value) })}
              disabled={disabled}
            >
              <SelectTrigger id="cols" className="h-9">
                <SelectValue placeholder="Colunas" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? 'coluna' : 'colunas'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Sensitivity Slider - Only visible in auto mode (Phase 2) */}
      {isAutoMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Sensibilidade de Deteção</Label>
            <span className="text-xs font-medium">{sensitivity}%</span>
          </div>
          <Slider
            value={[sensitivity]}
            onValueChange={(value) => onSensitivityChange(value[0])}
            min={1}
            max={100}
            step={1}
            disabled={disabled || true} // Disabled in Phase 1
            className="w-full"
          />
        </div>
      )}

      {/* Remove Borders Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="remove-borders"
          checked={removeBorders}
          onCheckedChange={(checked) => onRemoveBordersChange(checked === true)}
          disabled={disabled}
        />
        <Label htmlFor="remove-borders" className="text-sm cursor-pointer">
          Remover margens/bordas
        </Label>
      </div>

      {/* Grid Preview Info */}
      {!isAutoMode && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          A grelha será dividida em <strong>{manualConfig.rows * manualConfig.cols}</strong> imagens
        </p>
      )}
    </div>
  );
}

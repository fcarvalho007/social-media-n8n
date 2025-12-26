import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GridConfig, ASPECT_RATIO_OPTIONS } from '@/types/grid-splitter';
import { Grid3x3, RectangleHorizontal } from 'lucide-react';

interface GridControlsProps {
  manualConfig: GridConfig;
  onManualConfigChange: (config: GridConfig) => void;
  removeBorders: boolean;
  onRemoveBordersChange: (value: boolean) => void;
  targetAspectRatio: number | null;
  onAspectRatioChange: (value: number | null) => void;
  disabled?: boolean;
}

export function GridControls({
  manualConfig,
  onManualConfigChange,
  removeBorders,
  onRemoveBordersChange,
  targetAspectRatio,
  onAspectRatioChange,
  disabled = false,
}: GridControlsProps) {
  // Find current aspect ratio option
  const currentAspectRatio = ASPECT_RATIO_OPTIONS.find(
    opt => opt.value === targetAspectRatio
  ) || ASPECT_RATIO_OPTIONS[0];

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Rows/Cols Selectors */}
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

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <Label htmlFor="aspect-ratio" className="text-xs text-muted-foreground flex items-center gap-1">
          <RectangleHorizontal className="h-3 w-3" />
          Proporção das células
        </Label>
        <Select
          value={targetAspectRatio?.toString() ?? 'original'}
          onValueChange={(value) => {
            const numValue = value === 'original' ? null : parseFloat(value);
            onAspectRatioChange(numValue);
          }}
          disabled={disabled}
        >
          <SelectTrigger id="aspect-ratio" className="h-9">
            <SelectValue placeholder="Proporção" />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIO_OPTIONS.map((opt) => (
              <SelectItem 
                key={opt.label} 
                value={opt.value?.toString() ?? 'original'}
              >
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
      <div className="text-xs text-muted-foreground text-center pt-2 border-t space-y-1">
        <p>
          A grelha será dividida em <strong>{manualConfig.rows * manualConfig.cols}</strong> imagens
        </p>
        {targetAspectRatio && (
          <p className="text-primary">
            Cada célula terá proporção <strong>{currentAspectRatio.label}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

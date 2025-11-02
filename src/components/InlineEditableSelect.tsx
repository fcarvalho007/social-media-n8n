import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InlineEditableSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onSave: (newValue: T) => void;
  renderDisplay?: (value: T, label: string) => React.ReactNode;
  className?: string;
}

export function InlineEditableSelect<T extends string>({
  value,
  options,
  onSave,
  renderDisplay,
  className,
}: InlineEditableSelectProps<T>) {
  const [isEditing, setIsEditing] = useState(false);

  const currentOption = options.find((opt) => opt.value === value);
  const currentLabel = currentOption?.label || value;

  const handleChange = (newValue: string) => {
    onSave(newValue as T);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Select value={value} onValueChange={handleChange} open onOpenChange={setIsEditing}>
        <SelectTrigger className={cn('w-auto', className)} aria-label="Selector inline">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer"
      title="Clique para alterar"
    >
      {renderDisplay ? renderDisplay(value, currentLabel) : <Badge>{currentLabel}</Badge>}
    </div>
  );
}

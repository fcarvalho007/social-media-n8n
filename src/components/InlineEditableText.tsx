import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

export function InlineEditableText({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = 'Escrever...',
  as: Component = 'span',
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn('h-auto p-1', inputClassName)}
        placeholder={placeholder}
        aria-label="Campo de edição inline"
      />
    );
  }

  return (
    <Component
      className={cn('cursor-pointer hover:text-primary transition-colors', className)}
      onDoubleClick={() => setIsEditing(true)}
      title="Duplo clique para editar"
    >
      {value}
    </Component>
  );
}

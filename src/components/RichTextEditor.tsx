import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Escreve a legenda...',
  rows = 6,
  maxLength = 2200,
  className
}: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const insertFormatting = (before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // Check if already formatted
    const beforeText = value.substring(start - before.length, start);
    const afterText = value.substring(end, end + after.length);
    
    let newValue: string;
    let newCursorPos: number;

    if (beforeText === before && afterText === after) {
      // Remove formatting
      newValue = value.substring(0, start - before.length) + selectedText + value.substring(end + after.length);
      newCursorPos = start - before.length + selectedText.length;
    } else {
      // Add formatting
      newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
      newCursorPos = start + before.length + selectedText.length + after.length;
    }

    onChange(newValue);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertFormatting('**');
  const handleItalic = () => insertFormatting('*');

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + emojiData.emoji + value.substring(end);
    
    onChange(newValue);
    setEmojiPickerOpen(false);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emojiData.emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-8 px-2"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          className="h-8 px-2"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Inserir Emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 border-0" align="start">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={320}
              height={400}
              searchPlaceHolder="Pesquisar emoji..."
              previewConfig={{ showPreview: false }}
            />
          </PopoverContent>
        </Popover>
        <div className="ml-auto text-xs text-muted-foreground px-2">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        className="w-full font-sans resize-none"
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
              e.preventDefault();
              handleBold();
            } else if (e.key === 'i') {
              e.preventDefault();
              handleItalic();
            }
          }
        }}
      />

      <p className="text-xs text-muted-foreground">
        Use **texto** para negrito e *texto* para itálico
      </p>
    </div>
  );
};

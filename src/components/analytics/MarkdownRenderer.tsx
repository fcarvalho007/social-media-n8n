import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    // Split content into lines
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-1.5 my-3">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: formatInlineText(item) }} />
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              {tableHeader.length > 0 && (
                <thead>
                  <tr className="bg-muted/50">
                    {tableHeader.map((cell, i) => (
                      <th key={i} className="px-3 py-2 text-left font-semibold border-b border-border">
                        {cell.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 border-b border-border/50">
                        <span dangerouslySetInnerHTML={{ __html: formatInlineText(cell.trim()) }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        tableHeader = [];
        inTable = false;
      }
    };

    const formatInlineText = (text: string): string => {
      return text
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Code
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline hover:no-underline">$1</a>')
        // Percentages highlight
        .replace(/(\d+(?:,\d+)?(?:\.\d+)?%)/g, '<span class="font-semibold text-primary">$1</span>')
        // Large numbers highlight
        .replace(/(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)+)/g, '<span class="font-semibold">$1</span>');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        flushList();
        flushTable();
        continue;
      }

      // Tables
      if (trimmedLine.startsWith('|')) {
        flushList();
        const cells = trimmedLine.split('|').filter(c => c.trim());
        
        // Check if it's a separator line
        if (trimmedLine.match(/^\|[\s-:|]+\|$/)) {
          inTable = true;
          continue;
        }

        if (!inTable && tableHeader.length === 0) {
          tableHeader = cells;
        } else {
          tableRows.push(cells);
          inTable = true;
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (trimmedLine.startsWith('## ')) {
        flushList();
        const headerText = trimmedLine.slice(3);
        const sectionColors: Record<string, string> = {
          'resumo executivo': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
          'comparação': 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
          'padrões': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
          'estratégia': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
          'hashtags': 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
          'oportunidades': 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
          'apêndice': 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
        };
        
        const colorKey = Object.keys(sectionColors).find(key => 
          headerText.toLowerCase().includes(key)
        );
        const colorClass = colorKey ? sectionColors[colorKey] : 'from-muted to-muted/50 border-border';

        elements.push(
          <div
            key={`h2-${i}`}
            className={cn(
              "mt-6 mb-4 p-3 rounded-lg bg-gradient-to-r border-l-4",
              colorClass
            )}
          >
            <h2 className="text-lg font-bold text-foreground">{headerText}</h2>
          </div>
        );
        continue;
      }

      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-foreground mt-4 mb-2">
            {trimmedLine.slice(4)}
          </h3>
        );
        continue;
      }

      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border">
            {trimmedLine.slice(2)}
          </h1>
        );
        continue;
      }

      // Numbered lists
      const numberedMatch = trimmedLine.match(/^(\d+)\)\s+(.+)$/);
      if (numberedMatch) {
        flushList();
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-3 my-2 text-sm">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
              {numberedMatch[1]}
            </span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(numberedMatch[2]) }} />
          </div>
        );
        continue;
      }

      // Bullet points
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        currentList.push(trimmedLine.slice(2));
        continue;
      }

      // Regular paragraphs
      flushList();
      elements.push(
        <p 
          key={`p-${i}`} 
          className="text-sm text-muted-foreground my-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInlineText(trimmedLine) }}
        />
      );
    }

    // Flush remaining lists/tables
    flushList();
    flushTable();

    return elements;
  }, [content]);

  return (
    <div className={cn("prose-custom", className)}>
      {renderedContent}
    </div>
  );
}

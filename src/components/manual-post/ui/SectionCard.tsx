import { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, AlertCircle, Pencil, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type SectionState = 'inactive' | 'active' | 'complete' | 'error';

export interface SectionCardProps {
  /** Identificador estável da secção (usado em aria-labelledby). */
  id: string;
  /** Número ordinal mostrado no header ("1.", "2." ...). */
  stepNumber?: number;
  /** Título da secção. */
  title: string;
  /** Ícone Lucide opcional renderizado antes do título. */
  icon?: LucideIcon;
  /** Estado actual — controla aparência e interactividade. */
  state: SectionState;
  /** Mensagem de erro mostrada quando `state === 'error'`. */
  errorMessage?: string;
  /** Conteúdo do estado expandido (active/error). */
  children: ReactNode;
  /** Resumo compacto mostrado quando `state === 'complete'`. */
  summary?: ReactNode;
  /** Callback quando o utilizador pede para activar/editar a secção. */
  onActivate?: () => void;
  /** Callback quando o utilizador clica em "Editar" no estado complete. */
  onEdit?: () => void;
  /** Se true, nunca colapsa automaticamente (ex.: agendamento). */
  neverAutoCollapse?: boolean;
  /** Classe extra para o wrapper. */
  className?: string;
}

/**
 * Componente visual base do padrão de progressive disclosure em
 * `/manual-create`. Renderiza 4 estados:
 *
 *  - `inactive`  — header subtil, conteúdo escondido, opacity 0.65.
 *  - `active`    — expandido, em foco, opacity 1.
 *  - `complete`  — colapsado, mostra `summary` + botão "Editar".
 *  - `error`     — expandido + destaque vermelho + `errorMessage`.
 *
 * Animações:
 *  - expand/collapse: 280ms ease-out (height + opacity).
 *  - fade interno: 200ms.
 *  - respeita `prefers-reduced-motion` (anima sem altura quando activo).
 *
 * O componente NÃO decide quando muda de estado — isso é responsabilidade
 * do consumidor, em conjunto com `useActiveSection` e validação local.
 */
export function SectionCard({
  id,
  stepNumber,
  title,
  icon: Icon,
  state,
  errorMessage,
  children,
  summary,
  onActivate,
  onEdit,
  neverAutoCollapse: _neverAutoCollapse,
  className,
}: SectionCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);
  const previousStateRef = useRef<SectionState>(state);

  // Quando passa para `active`, foca o header (ajuda navegação por teclado e
  // anuncia ao screen reader que a secção está em foco).
  useEffect(() => {
    if (previousStateRef.current !== 'active' && state === 'active') {
      const timer = window.setTimeout(() => {
        headerRef.current?.focus({ preventScroll: false });
      }, 50);
      previousStateRef.current = state;
      return () => window.clearTimeout(timer);
    }
    previousStateRef.current = state;
  }, [state]);

  const isExpanded = state === 'active' || state === 'error';
  const isInactive = state === 'inactive';
  const isComplete = state === 'complete';
  const isError = state === 'error';

  const headerId = `section-${id}-header`;
  const contentId = `section-${id}-content`;

  const handleHeaderClick = () => {
    if (isInactive && onActivate) onActivate();
    else if (isComplete && onEdit) onEdit();
  };

  const handleHeaderKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleHeaderClick();
    }
  };

  const interactiveHeader = (isInactive && !!onActivate) || (isComplete && !!onEdit);

  return (
    <section
      id={id}
      aria-labelledby={headerId}
      data-section-state={state}
      className={cn(
        'manual-card-shell relative overflow-hidden rounded-lg border bg-card shadow-sm transition-opacity duration-[250ms]',
        isInactive && 'opacity-65 hover:opacity-85',
        (isComplete || isExpanded) && 'opacity-100',
        isError && 'border-destructive/60',
        isComplete && 'border-success/40',
        className,
      )}
    >
      {/* Header */}
      <div
        ref={headerRef}
        id={headerId}
        role={interactiveHeader ? 'button' : undefined}
        tabIndex={interactiveHeader ? 0 : -1}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={interactiveHeader ? handleHeaderClick : undefined}
        onKeyDown={interactiveHeader ? handleHeaderKey : undefined}
        className={cn(
          'flex items-center gap-3 px-5 py-4 outline-none',
          interactiveHeader && 'cursor-pointer hover:bg-muted/40',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        )}
      >
        {/* Status badge / step number */}
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
            isComplete && 'bg-success text-success-foreground',
            isError && 'bg-destructive text-destructive-foreground',
            state === 'active' && 'bg-primary text-primary-foreground',
            isInactive && 'border border-border bg-muted text-muted-foreground',
          )}
          aria-hidden="true"
        >
          {isComplete ? (
            <Check className="h-4 w-4" strokeWidth={2.5} />
          ) : isError ? (
            <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            stepNumber ?? '·'
          )}
        </div>

        {Icon && (
          <Icon
            className={cn('h-5 w-5 shrink-0', isError ? 'text-destructive' : 'text-muted-foreground')}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}

        <div className="min-w-0 flex-1">
          <h3 className="manual-section-title truncate text-foreground">{title}</h3>
          {isError && errorMessage && (
            <p className="mt-0.5 text-xs text-destructive">{errorMessage}</p>
          )}
        </div>

        {isComplete && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="manual-touch-target gap-1 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            Editar
          </Button>
        )}
      </div>

      {/* Summary visível apenas no estado complete */}
      {isComplete && summary && (
        <div className="border-t border-border/40 px-5 py-3 text-sm">{summary}</div>
      )}

      {/* Conteúdo expandido */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            id={contentId}
            role="region"
            aria-labelledby={headerId}
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

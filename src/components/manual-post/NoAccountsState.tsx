import { Link2Off, Settings, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'no-accounts' | 'no-permissions' | 'connection-error' | 'file-limit';
  onRetry?: () => void;
  maxFiles?: number;
  className?: string;
}

interface ConfigAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

interface EmptyStateConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ConfigAction;
  iconColor: string;
}

export function EmptyState({ type, onRetry, maxFiles = 10, className }: EmptyStateProps) {
  const navigate = useNavigate();

  const configs: Record<EmptyStateProps['type'], EmptyStateConfig> = {
    'no-accounts': {
      icon: Link2Off,
      title: 'Nenhuma conta conectada',
      description: 'Conecta pelo menos uma rede social para começar a publicar',
      action: {
        label: 'Ir para definições',
        onClick: () => navigate('/settings/accounts'),
      },
      iconColor: 'text-muted-foreground',
    },
    'no-permissions': {
      icon: AlertCircle,
      title: 'Sem permissões',
      description: 'Precisas de permissão para publicar nesta conta. Contacta o administrador.',
      action: {
        label: 'Solicitar acesso',
        onClick: () => navigate('/settings/permissions'),
      },
      iconColor: 'text-warning',
    },
    'connection-error': {
      icon: WifiOff,
      title: 'Erro de conexão',
      description: 'Não foi possível conectar ao servidor. Verifica a tua ligação à internet.',
      action: onRetry ? {
        label: 'Tentar novamente',
        onClick: onRetry,
        icon: RefreshCw,
      } : undefined,
      iconColor: 'text-destructive',
    },
    'file-limit': {
      icon: AlertCircle,
      title: `Limite de ${maxFiles} ficheiros atingido`,
      description: 'Remove algum ficheiro para adicionar mais.',
      iconColor: 'text-warning',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 rounded-xl",
      "border-2 border-dashed border-border bg-muted/20",
      "text-center space-y-4",
      className
    )}>
      <div className={cn(
        "p-4 rounded-full bg-muted/50",
        config.iconColor
      )}>
        <Icon className="h-10 w-10" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{config.title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {config.description}
        </p>
      </div>

      {config.action && (
        <Button 
          onClick={config.action.onClick}
          variant="outline"
          className="gap-2"
        >
          {config.action.icon && <config.action.icon className="h-4 w-4" />}
          {config.action.label}
        </Button>
      )}
    </div>
  );
}

// Media validation warning component
interface MediaWarningProps {
  warnings: string[];
  suggestions: string[];
  className?: string;
}

export function MediaWarning({ warnings, suggestions, className }: MediaWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg",
      "bg-warning-light border border-warning/30",
      className
    )}>
      <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        {warnings.map((warning, idx) => (
          <p key={idx} className="text-sm font-medium text-warning-foreground">
            {warning}
          </p>
        ))}
        {suggestions.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {suggestions.map((suggestion, idx) => (
              <p key={idx}>{suggestion}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Auto-save indicator component
interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export function AutoSaveIndicator({ lastSaved, isSaving, hasUnsavedChanges }: AutoSaveIndicatorProps) {
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        <span>A guardar...</span>
      </div>
    );
  }

  if (lastSaved) {
    const timeStr = lastSaved.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span>Rascunho guardado às {timeStr}</span>
        {hasUnsavedChanges && (
          <span className="text-warning">• Alterações não guardadas</span>
        )}
      </div>
    );
  }

  return null;
}

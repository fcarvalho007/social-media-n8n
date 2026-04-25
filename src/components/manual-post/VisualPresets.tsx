import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormat } from '@/types/social';
import { NETWORK_ICONS } from '@/lib/networkIcons';
import type { SocialNetwork } from '@/types/social';

/**
 * Presets visuais ricos para a Secção 1 ("Seleciona onde publicar").
 *
 * Cada preset = uma intenção editorial (Carrossel, Vídeo curto, Post,
 * Stories) representada por uma ilustração SVG mini + ícones coloridos
 * das redes-alvo + subtítulo curto.
 *
 * Decisões de design:
 * - Ilustrações SVG inline (sem dependências externas) com `currentColor`
 *   para herdar `text-muted-foreground` (padrão) ou `text-primary`
 *   (selecionado).
 * - Estado seleccionado = todas as `formats` do preset estão presentes em
 *   `selectedFormats`. Toggle remove todas.
 * - Layout: grid 2 colunas em todos os breakpoints (≥360px).
 *
 * NÃO contém lógica de seleção própria — é puramente apresentação
 * controlada pelo pai via `onSelectPreset`.
 */
interface VisualPreset {
  id: string;
  name: string;
  subtitle: string;
  formats: PostFormat[];
  networks: SocialNetwork[];
  illustration: 'carousel' | 'shortVideo' | 'photo' | 'stories';
}

const PRESETS: VisualPreset[] = [
  {
    id: 'carousel',
    name: 'Carrossel',
    subtitle: 'Imagens com legenda',
    formats: ['instagram_carousel', 'linkedin_document'],
    networks: ['instagram', 'linkedin'],
    illustration: 'carousel',
  },
  {
    id: 'short-video',
    name: 'Vídeo curto',
    subtitle: 'Reels, Shorts, TikTok',
    formats: ['instagram_reel', 'youtube_shorts', 'tiktok_video', 'linkedin_post'],
    networks: ['instagram', 'youtube', 'tiktok', 'linkedin'],
    illustration: 'shortVideo',
  },
  {
    id: 'photo',
    name: 'Post com imagem',
    subtitle: 'Foto única',
    formats: ['instagram_image', 'linkedin_post', 'facebook_image'],
    networks: ['instagram', 'linkedin', 'facebook'],
    illustration: 'photo',
  },
  {
    id: 'stories',
    name: 'Stories',
    subtitle: '24h, multi-plataforma',
    formats: ['instagram_stories', 'facebook_stories', 'googlebusiness_post'],
    networks: ['instagram', 'facebook', 'googlebusiness'],
    illustration: 'stories',
  },
];

interface VisualPresetsProps {
  selectedFormats: PostFormat[];
  onSelectPreset: (formats: PostFormat[]) => void;
}

export function VisualPresets({ selectedFormats, onSelectPreset }: VisualPresetsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PRESETS.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          selectedFormats={selectedFormats}
          onSelectPreset={onSelectPreset}
        />
      ))}
    </div>
  );
}

interface PresetCardProps {
  preset: VisualPreset;
  selectedFormats: PostFormat[];
  onSelectPreset: (formats: PostFormat[]) => void;
}

function PresetCard({ preset, selectedFormats, onSelectPreset }: PresetCardProps) {
  // Cálculo trivial sobre arrays de 2-4 elementos — `useMemo` aqui dá
  // overhead sem ganho mensurável.
  const isActive = preset.formats.every((f) => selectedFormats.includes(f));

  const handleClick = () => {
    if (isActive) {
      onSelectPreset(selectedFormats.filter((f) => !preset.formats.includes(f)));
    } else {
      onSelectPreset(Array.from(new Set([...selectedFormats, ...preset.formats])) as PostFormat[]);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isActive}
      className={cn(
        // Sem `overflow-hidden`: o glow de seleção é uma sombra externa
        // e não há conteúdo interno a clipar. Evita flicker no hover.
        'group relative flex min-h-[140px] flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive && 'border-primary bg-primary/5 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.4)]',
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      <div
        className={cn(
          'flex h-10 w-full items-center justify-start text-muted-foreground transition-colors duration-200',
          isActive && 'text-primary',
        )}
      >
        <PresetIllustration kind={preset.illustration} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold leading-tight text-foreground sm:text-[15px]">
          {preset.name}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">
          {preset.subtitle}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-1">
        {preset.networks.map((net) => {
          const NetIcon = NETWORK_ICONS[net].icon;
          return (
            <NetIcon
              key={net}
              className="h-3.5 w-3.5"
              strokeWidth={1.5}
              style={{ color: NETWORK_ICONS[net].color }}
              aria-label={NETWORK_ICONS[net].label}
            />
          );
        })}
      </div>
    </button>
  );
}

/**
 * Ilustrações SVG mini (40px altura). Usam `currentColor` para herdar a
 * cor do contentor (muted ou primary).
 */
function PresetIllustration({ kind }: { kind: VisualPreset['illustration'] }) {
  switch (kind) {
    case 'carousel':
      // 3 quadrados sobrepostos em perspetiva (carrossel)
      return (
        <svg
          viewBox="0 0 56 40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className="h-full w-auto"
        >
          <rect x="6" y="8" width="22" height="24" rx="3" opacity="0.4" />
          <rect x="14" y="6" width="22" height="26" rx="3" opacity="0.7" />
          <rect x="22" y="4" width="22" height="28" rx="3" />
          <circle cx="33" cy="14" r="2" />
          <path d="M28 26 L34 20 L42 28" />
        </svg>
      );
    case 'shortVideo':
      // Telemóvel vertical 9:16 com play
      return (
        <svg
          viewBox="0 0 56 40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className="h-full w-auto"
        >
          <rect x="20" y="3" width="16" height="34" rx="3" />
          <line x1="24" y1="6" x2="32" y2="6" opacity="0.5" />
          <polygon points="25,16 25,28 33,22" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'photo':
      // Quadrado 1:1 com placeholder
      return (
        <svg
          viewBox="0 0 56 40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className="h-full w-auto"
        >
          <rect x="14" y="6" width="28" height="28" rx="3" />
          <circle cx="22" cy="16" r="2.5" />
          <path d="M16 30 L24 22 L30 27 L36 21 L40 25" />
        </svg>
      );
    case 'stories':
      // Vertical com timer no topo (ring indicator)
      return (
        <svg
          viewBox="0 0 56 40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className="h-full w-auto"
        >
          <rect x="20" y="3" width="16" height="34" rx="3" />
          <line x1="22" y1="6" x2="27" y2="6" strokeWidth={2} />
          <line x1="29" y1="6" x2="34" y2="6" opacity="0.3" strokeWidth={2} />
          <circle cx="28" cy="20" r="6" opacity="0.6" />
          <circle cx="28" cy="20" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

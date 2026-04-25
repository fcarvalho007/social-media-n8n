import { forwardRef, type SVGProps } from 'react';

/**
 * Logótipo TikTok como SVG inline. Substitui o `Music2` do Lucide
 * (semanticamente errado para a marca). Compatível com `LucideIcon`:
 * aceita `className`, `style`, `aria-*` e devolve um `<svg>`.
 *
 * Como `LucideIcon` é um tipo opaco do package `lucide-react`, a
 * interface comum usada em `NetworkIconConfig` foi alargada para
 * `React.ComponentType<SVGProps<SVGSVGElement>>` (ver `networkIcons.ts`).
 *
 * `strokeWidth` é aceite mas ignorado — o logótipo TikTok é
 * preenchido (`fill`), não traçado, por isso o `stroke-width` não se
 * aplica visualmente. Mantém-se na assinatura para não partir os
 * call-sites que o passam por hábito (ex.: `<Icon strokeWidth={1.5} />`).
 */
interface TikTokIconProps extends SVGProps<SVGSVGElement> {
  strokeWidth?: number | string;
}

export const TikTokIcon = forwardRef<SVGSVGElement, TikTokIconProps>(
  ({ strokeWidth: _strokeWidth, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
    </svg>
  ),
);
TikTokIcon.displayName = 'TikTokIcon';

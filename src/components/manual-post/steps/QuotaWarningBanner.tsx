import { AlertTriangle } from 'lucide-react';

interface QuotaInfo {
  percentage: number;
}

interface QuotaWarningBannerProps {
  selectedNetworks: string[];
  isUnlimited: boolean;
  instagram: QuotaInfo;
  linkedin: QuotaInfo;
}

/**
 * Compact warning shown when IG/LinkedIn quota is at >= 80%.
 * Phase 4 polish — extracted from ManualCreate.tsx.
 */
export function QuotaWarningBanner({
  selectedNetworks,
  isUnlimited,
  instagram,
  linkedin,
}: QuotaWarningBannerProps) {
  if (isUnlimited || selectedNetworks.length === 0) return null;

  const igOver = selectedNetworks.includes('instagram') && instagram.percentage >= 80;
  const liOver = selectedNetworks.includes('linkedin') && linkedin.percentage >= 80;
  if (!igOver && !liOver) return null;

  const igFull = selectedNetworks.includes('instagram') && instagram.percentage >= 100;
  const liFull = selectedNetworks.includes('linkedin') && linkedin.percentage >= 100;
  const onlyWarning =
    (selectedNetworks.includes('instagram') && instagram.percentage >= 80 && instagram.percentage < 100) ||
    (selectedNetworks.includes('linkedin') && linkedin.percentage >= 80 && linkedin.percentage < 100);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 p-2 mx-2 sm:mx-0 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="text-[11px] sm:text-sm truncate">
        {igFull && 'Quota IG esgotada'}
        {liFull && 'Quota LI esgotada'}
        {onlyWarning && !igFull && !liFull && 'Quota quase esgotada'}
      </span>
    </div>
  );
}

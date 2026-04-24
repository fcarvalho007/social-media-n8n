import { average, standardDeviation } from './metrics';

export function approximateTTestPValue(a: number[], b: number[]) {
  const left = a.filter(Number.isFinite);
  const right = b.filter(Number.isFinite);
  if (left.length < 2 || right.length < 2) return 1;
  const meanA = average(left);
  const meanB = average(right);
  const sdA = standardDeviation(left);
  const sdB = standardDeviation(right);
  const standardError = Math.sqrt((sdA ** 2) / left.length + (sdB ** 2) / right.length);
  if (!standardError) return 1;
  const t = Math.abs((meanA - meanB) / standardError);
  return Math.max(0.001, Math.min(1, 2 * (1 - normalCdf(t))));
}

export function deltaPercentage(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-abs * abs);
  return sign * y;
}

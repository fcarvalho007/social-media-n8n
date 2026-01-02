// Consistent color palette for multi-account analytics
// Up to 10 distinct colors for account differentiation

export const ACCOUNT_COLORS = [
  "hsl(262, 83%, 58%)",  // Purple (primary)
  "hsl(221, 83%, 53%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(25, 95%, 53%)",   // Orange
  "hsl(340, 82%, 52%)",  // Pink
  "hsl(45, 93%, 47%)",   // Yellow
  "hsl(180, 70%, 45%)",  // Cyan
  "hsl(0, 72%, 51%)",    // Red
  "hsl(280, 60%, 55%)",  // Violet
  "hsl(160, 60%, 40%)",  // Teal
];

export const ACCOUNT_COLORS_CHART = [
  "#8B5CF6",  // Purple
  "#3B82F6",  // Blue
  "#22C55E",  // Green
  "#F97316",  // Orange
  "#EC4899",  // Pink
  "#EAB308",  // Yellow
  "#06B6D4",  // Cyan
  "#EF4444",  // Red
  "#A855F7",  // Violet
  "#14B8A6",  // Teal
];

export function getAccountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

export function getAccountColorChart(index: number): string {
  return ACCOUNT_COLORS_CHART[index % ACCOUNT_COLORS_CHART.length];
}

export interface AccountColorMap {
  [username: string]: {
    color: string;
    chartColor: string;
    index: number;
  };
}

export function createAccountColorMap(usernames: string[]): AccountColorMap {
  const map: AccountColorMap = {};
  usernames.forEach((username, index) => {
    map[username] = {
      color: getAccountColor(index),
      chartColor: getAccountColorChart(index),
      index,
    };
  });
  return map;
}

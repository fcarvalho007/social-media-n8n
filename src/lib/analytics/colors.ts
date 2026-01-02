// Consistent color palette for multi-account analytics
// Up to 10 distinct colors for account differentiation

// Special color for "My Account" - golden/amber
export const MY_ACCOUNT_COLOR = "hsl(45, 93%, 47%)";
export const MY_ACCOUNT_COLOR_CHART = "#F59E0B";

export const ACCOUNT_COLORS = [
  "hsl(262, 83%, 58%)",  // Purple (primary)
  "hsl(221, 83%, 53%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(25, 95%, 53%)",   // Orange
  "hsl(340, 82%, 52%)",  // Pink
  "hsl(180, 70%, 45%)",  // Cyan
  "hsl(0, 72%, 51%)",    // Red
  "hsl(280, 60%, 55%)",  // Violet
  "hsl(160, 60%, 40%)",  // Teal
  "hsl(200, 70%, 50%)",  // Sky
];

export const ACCOUNT_COLORS_CHART = [
  "#8B5CF6",  // Purple
  "#3B82F6",  // Blue
  "#22C55E",  // Green
  "#F97316",  // Orange
  "#EC4899",  // Pink
  "#06B6D4",  // Cyan
  "#EF4444",  // Red
  "#A855F7",  // Violet
  "#14B8A6",  // Teal
  "#0EA5E9",  // Sky
];

export function getAccountColor(index: number, isMyAccount: boolean = false): string {
  if (isMyAccount) return MY_ACCOUNT_COLOR;
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

export function getAccountColorChart(index: number, isMyAccount: boolean = false): string {
  if (isMyAccount) return MY_ACCOUNT_COLOR_CHART;
  return ACCOUNT_COLORS_CHART[index % ACCOUNT_COLORS_CHART.length];
}

export interface AccountColorMap {
  [username: string]: {
    color: string;
    chartColor: string;
    index: number;
  };
}

export function createAccountColorMap(usernames: string[], myAccount?: string): AccountColorMap {
  const map: AccountColorMap = {};
  let colorIndex = 0;
  
  usernames.forEach((username) => {
    const isMyAccount = username === myAccount;
    map[username] = {
      color: getAccountColor(isMyAccount ? 0 : colorIndex, isMyAccount),
      chartColor: getAccountColorChart(isMyAccount ? 0 : colorIndex, isMyAccount),
      index: isMyAccount ? -1 : colorIndex,
    };
    if (!isMyAccount) colorIndex++;
  });
  
  return map;
}

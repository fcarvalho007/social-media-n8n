// Centralized chart colors for analytics dashboard
// Uses HSL values matching the design system

export const CHART_COLORS = {
  // Content type colors with gradients
  video: {
    gradient: ["#667EEA", "#764BA2"],
    solid: "#667EEA",
    hsl: "239 74% 66%",
  },
  carrossel: {
    gradient: ["#F093FB", "#F5576C"],
    solid: "#F093FB",
    hsl: "292 92% 78%",
  },
  sidecar: {
    gradient: ["#F093FB", "#F5576C"],
    solid: "#F093FB",
    hsl: "292 92% 78%",
  },
  image: {
    gradient: ["#4FACFE", "#00F2FE"],
    solid: "#4FACFE",
    hsl: "203 99% 65%",
  },
  
  // Engagement metrics
  likes: {
    solid: "#F43F5E",
    hsl: "347 87% 60%",
  },
  comments: {
    solid: "#8B5CF6",
    hsl: "262 83% 66%",
  },
  engagement: {
    solid: "#10B981",
    hsl: "160 84% 39%",
  },
  views: {
    solid: "#06B6D4",
    hsl: "188 94% 43%",
  },
  
  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  neutral: "#6B7280",
  
  // Primary palette
  primary: "#6366F1",
  primaryHover: "#4F46E5",
  primaryLight: "#E0E7FF",
};

// Type labels for content types
export const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
  Reel: "Reel",
};

// Type icons mapping
export const TYPE_ICONS: Record<string, string> = {
  Image: "Image",
  Video: "Video",
  Sidecar: "Layout",
  Reel: "Play",
};

// Get gradient for chart by content type
export function getChartGradient(type: string): [string, string] {
  const normalizedType = type.toLowerCase();
  if (normalizedType === "video" || normalizedType === "reel") {
    return CHART_COLORS.video.gradient as [string, string];
  }
  if (normalizedType === "sidecar" || normalizedType === "carrossel") {
    return CHART_COLORS.carrossel.gradient as [string, string];
  }
  return CHART_COLORS.image.gradient as [string, string];
}

// Get solid color for chart by content type
export function getChartSolidColor(type: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType === "video" || normalizedType === "reel") {
    return CHART_COLORS.video.solid;
  }
  if (normalizedType === "sidecar" || normalizedType === "carrossel") {
    return CHART_COLORS.carrossel.solid;
  }
  return CHART_COLORS.image.solid;
}

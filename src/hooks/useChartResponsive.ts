import { useState, useEffect, useCallback, RefObject } from "react";

interface ChartResponsiveConfig {
  aspectRatio: number;
  fontSize: number;
  tickFontSize: number;
  legendFontSize: number;
  margin: { top: number; right: number; bottom: number; left: number };
  showXAxis: boolean;
  showYAxis: boolean;
  showLegend: boolean;
}

interface UseChartResponsiveOptions {
  containerRef?: RefObject<HTMLElement>;
  breakpoints?: {
    mobile: number;
    tablet: number;
  };
}

const DEFAULT_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
};

export function useChartResponsive(options: UseChartResponsiveOptions = {}): ChartResponsiveConfig {
  const { containerRef, breakpoints = DEFAULT_BREAKPOINTS } = options;
  
  const [config, setConfig] = useState<ChartResponsiveConfig>({
    aspectRatio: 2,
    fontSize: 12,
    tickFontSize: 11,
    legendFontSize: 12,
    margin: { top: 10, right: 30, bottom: 30, left: 40 },
    showXAxis: true,
    showYAxis: true,
    showLegend: true,
  });

  const updateConfig = useCallback(() => {
    const width = containerRef?.current?.offsetWidth || window.innerWidth;
    
    if (width <= breakpoints.mobile) {
      // Mobile config
      setConfig({
        aspectRatio: 1.2,
        fontSize: 10,
        tickFontSize: 9,
        legendFontSize: 10,
        margin: { top: 5, right: 10, bottom: 25, left: 30 },
        showXAxis: true,
        showYAxis: false,
        showLegend: false,
      });
    } else if (width <= breakpoints.tablet) {
      // Tablet config
      setConfig({
        aspectRatio: 1.5,
        fontSize: 11,
        tickFontSize: 10,
        legendFontSize: 11,
        margin: { top: 10, right: 20, bottom: 30, left: 35 },
        showXAxis: true,
        showYAxis: true,
        showLegend: true,
      });
    } else {
      // Desktop config
      setConfig({
        aspectRatio: 2,
        fontSize: 12,
        tickFontSize: 11,
        legendFontSize: 12,
        margin: { top: 10, right: 30, bottom: 30, left: 40 },
        showXAxis: true,
        showYAxis: true,
        showLegend: true,
      });
    }
  }, [containerRef, breakpoints]);

  useEffect(() => {
    updateConfig();
    
    const handleResize = () => {
      updateConfig();
    };
    
    window.addEventListener("resize", handleResize);
    
    // Use ResizeObserver if container ref is provided
    let observer: ResizeObserver | null = null;
    if (containerRef?.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [updateConfig, containerRef]);

  return config;
}

// Hook for detecting mobile/tablet/desktop
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">("desktop");
  
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint("mobile");
      } else if (width < 1024) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    };
    
    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);
  
  return breakpoint;
}

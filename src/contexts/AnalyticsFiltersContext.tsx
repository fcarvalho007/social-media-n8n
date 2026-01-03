import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type PeriodFilter = "7d" | "30d" | "90d" | "1y" | "all";
export type ContentTypeFilter = "Image" | "Video" | "Sidecar";

export interface AnalyticsFilters {
  period: PeriodFilter;
  account: string;
  contentTypes: ContentTypeFilter[];
  engagementRange: [number, number];
  searchQuery: string;
}

interface AnalyticsFiltersContextType {
  filters: AnalyticsFilters;
  setPeriod: (period: PeriodFilter) => void;
  setAccount: (account: string) => void;
  setContentTypes: (types: ContentTypeFilter[]) => void;
  setEngagementRange: (range: [number, number]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: AnalyticsFilters = {
  period: "all",
  account: "all",
  contentTypes: ["Image", "Video", "Sidecar"],
  engagementRange: [0, 100000],
  searchQuery: "",
};

const AnalyticsFiltersContext = createContext<AnalyticsFiltersContextType | undefined>(undefined);

export function AnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem("analytics-filters");
      if (saved) {
        return { ...defaultFilters, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultFilters;
  });

  // Persist to localStorage on change
  const updateFilters = useCallback((updates: Partial<AnalyticsFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem("analytics-filters", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setPeriod = useCallback((period: PeriodFilter) => {
    updateFilters({ period });
  }, [updateFilters]);

  const setAccount = useCallback((account: string) => {
    updateFilters({ account });
  }, [updateFilters]);

  const setContentTypes = useCallback((contentTypes: ContentTypeFilter[]) => {
    updateFilters({ contentTypes: contentTypes.length === 0 ? ["Image", "Video", "Sidecar"] : contentTypes });
  }, [updateFilters]);

  const setEngagementRange = useCallback((engagementRange: [number, number]) => {
    updateFilters({ engagementRange });
  }, [updateFilters]);

  const setSearchQuery = useCallback((searchQuery: string) => {
    updateFilters({ searchQuery });
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    try {
      localStorage.removeItem("analytics-filters");
    } catch {}
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.period !== "all" ||
      filters.account !== "all" ||
      filters.contentTypes.length < 3 ||
      filters.engagementRange[0] > 0 ||
      filters.engagementRange[1] < 100000 ||
      filters.searchQuery.length > 0
    );
  }, [filters]);

  const value = useMemo(() => ({
    filters,
    setPeriod,
    setAccount,
    setContentTypes,
    setEngagementRange,
    setSearchQuery,
    resetFilters,
    hasActiveFilters,
  }), [filters, setPeriod, setAccount, setContentTypes, setEngagementRange, setSearchQuery, resetFilters, hasActiveFilters]);

  return (
    <AnalyticsFiltersContext.Provider value={value}>
      {children}
    </AnalyticsFiltersContext.Provider>
  );
}

export function useAnalyticsFilters() {
  const context = useContext(AnalyticsFiltersContext);
  if (!context) {
    throw new Error("useAnalyticsFilters must be used within an AnalyticsFiltersProvider");
  }
  return context;
}

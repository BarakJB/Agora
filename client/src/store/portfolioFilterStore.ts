import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PortfolioFilter = 'all' | 'personal' | 'partners';

interface PortfolioFilterState {
  portfolioFilter: PortfolioFilter;
  setPortfolioFilter: (filter: PortfolioFilter) => void;
}

export const usePortfolioFilterStore = create<PortfolioFilterState>()(
  persist(
    (set) => ({
      portfolioFilter: 'all',
      setPortfolioFilter: (filter) => set({ portfolioFilter: filter }),
    }),
    {
      name: 'agora-portfolio-filter',
      partialize: (state) => ({ portfolioFilter: state.portfolioFilter }),
    },
  ),
);

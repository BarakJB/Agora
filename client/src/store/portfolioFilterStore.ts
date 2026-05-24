import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { salesApi } from '../services/api';

export type PortfolioFilter = 'all' | 'personal' | 'partners';

interface PortfolioFilterState {
  portfolioFilter: PortfolioFilter;
  hasMultiplePortfolios: boolean;
  lastSalesUploadAt: number;
  setPortfolioFilter: (filter: PortfolioFilter) => void;
  checkMultiplePortfolios: () => Promise<void>;
  notifySalesUploaded: () => void;
}

export const usePortfolioFilterStore = create<PortfolioFilterState>()(
  persist(
    (set) => ({
      portfolioFilter: 'all',
      hasMultiplePortfolios: false,
      lastSalesUploadAt: 0,

      setPortfolioFilter: (filter) => set({ portfolioFilter: filter }),

      notifySalesUploaded: () => set({ lastSalesUploadAt: Date.now() }),

      checkMultiplePortfolios: async () => {
        try {
          const res = await salesApi.getPortfolioTypes();
          const types = res.data?.types ?? [];
          const hasBoth = types.includes('personal') && types.includes('partners');

          set((state) => ({
            hasMultiplePortfolios: hasBoth,
            portfolioFilter: hasBoth ? state.portfolioFilter : 'all',
          }));
        } catch {
          // silent — keep existing state
        }
      },
    }),
    {
      name: 'agora-portfolio-filter',
      partialize: (state) => ({ portfolioFilter: state.portfolioFilter }),
    },
  ),
);

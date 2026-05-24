import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAgentNumbers } from '../services/api';

export type PortfolioFilter = 'all' | 'personal' | 'partners';

interface PortfolioFilterState {
  portfolioFilter: PortfolioFilter;
  hasMultiplePortfolios: boolean;
  setPortfolioFilter: (filter: PortfolioFilter) => void;
  checkMultiplePortfolios: () => Promise<void>;
}

export const usePortfolioFilterStore = create<PortfolioFilterState>()(
  persist(
    (set) => ({
      portfolioFilter: 'all',
      hasMultiplePortfolios: false,

      setPortfolioFilter: (filter) => set({ portfolioFilter: filter }),

      checkMultiplePortfolios: async () => {
        try {
          const res = await getAgentNumbers();
          const numbers = res.data ?? [];

          const grouped: Record<string, Set<'personal' | 'partners'>> = {};
          for (const n of numbers) {
            if (!grouped[n.insuranceCompanyId]) {
              grouped[n.insuranceCompanyId] = new Set();
            }
            grouped[n.insuranceCompanyId].add(n.portfolioType);
          }

          const anyCompanyWithBoth = Object.values(grouped).some(
            (types) => types.has('personal') && types.has('partners'),
          );

          set((state) => ({
            hasMultiplePortfolios: anyCompanyWithBoth,
            portfolioFilter: anyCompanyWithBoth ? state.portfolioFilter : 'all',
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

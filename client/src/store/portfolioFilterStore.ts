import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { salesApi, getAgentNumbers } from '../services/api';
import type { AgentNumber } from '../services/api';

export type PortfolioFilter = 'all' | 'personal' | 'partners';

interface PortfolioFilterState {
  portfolioFilter: PortfolioFilter;
  hasMultiplePortfolios: boolean;
  agentNumbers: AgentNumber[];
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
      agentNumbers: [],
      lastSalesUploadAt: 0,

      setPortfolioFilter: (filter) => set({ portfolioFilter: filter }),

      notifySalesUploaded: () => set({ lastSalesUploadAt: Date.now() }),

      checkMultiplePortfolios: async () => {
        try {
          const [typesRes, numbersRes] = await Promise.all([
            salesApi.getPortfolioTypes(),
            getAgentNumbers(),
          ]);

          const types = typesRes.data?.types ?? [];
          const hasBoth = types.includes('personal') && types.includes('partners');
          const agentNumbers = numbersRes.data ?? [];

          set((state) => ({
            hasMultiplePortfolios: hasBoth,
            agentNumbers,
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

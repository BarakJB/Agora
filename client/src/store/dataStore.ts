import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';
import type { UserMode } from './authStore';

export interface PolicyRow {
  id: string;
  clientName: string;
  clientInitials: string;
  productType: string;
  productTypeHe: string;
  insuranceCompany: string;
  startDate: string;
  premiumAmount: number;
  commissionPct: number;
  recurringPct: number;
  commissionAmount: number;
  status: 'active' | 'cancelled' | 'pending';
}

export interface CommissionRow {
  id: string;
  policyId: string;
  clientName: string;
  clientInitials: string;
  type: 'one_time' | 'recurring' | 'volume' | 'bonus';
  typeHe: string;
  amount: number;
  insuranceCompany: string;
  date: string;
  processingMonth: string; // format: "YYYY-MM"
  productTypeHe: string;
  clientIdNumber?: string;
  branch?: string;
  premiumAmount?: number;
}

export interface UploadRow {
  id: string;
  fileName: string;
  company: string;
  date: string;
  records: number;
  status: 'completed' | 'error' | 'processing';
}

export interface DashboardStats {
  currentSalary: number;
  predictedSalary: number;
  growthPct: number;
  newPolicies: number;
  conversionRate: number;
  avgProcessingDays: number;
  bonusTarget: number;
  bonusCurrent: number;
  bonusAmount: number;
}

interface CarrierCommission {
  name: string;
  amount: number;
}

interface PolicyBreakdown {
  type: string;
  typeHe: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  barColor: string;
  amount: number;
  pct: number;
}

interface DataState {
  policies: PolicyRow[];
  commissions: CommissionRow[];
  uploads: UploadRow[];
  dashboard: DashboardStats;
  carrierCommissions: CarrierCommission[];
  policyBreakdown: PolicyBreakdown[];
  totalCommissions: number;
  targetProgress: number;
  projectedTotal: number;
  loading: boolean;
  error: string | null;
  loadData: (mode: UserMode) => void;
  fetchFromApi: () => Promise<void>;
  addPolicy: (policy: PolicyRow) => void;
  addCommission: (commission: CommissionRow) => void;
  addCommissionsBatch: (commissions: CommissionRow[]) => void;
  addUpload: (upload: UploadRow) => void;
  loadSalesFromDb: () => Promise<void>;
}

const PRODUCT_TYPE_MAP: Record<string, { typeHe: string; icon: string; iconBg: string; iconColor: string; barColor: string }> = {
  pension: { typeHe: 'פנסיה', icon: 'account_balance', iconBg: 'bg-surface-container-high', iconColor: 'text-primary', barColor: 'bg-primary' },
  health: { typeHe: 'בריאות', icon: 'medical_services', iconBg: 'bg-secondary-container', iconColor: 'text-secondary', barColor: 'bg-secondary' },
  life_insurance: { typeHe: 'חיים', icon: 'favorite', iconBg: 'bg-error-container', iconColor: 'text-error', barColor: 'bg-error' },
  managers_insurance: { typeHe: 'ביטוח מנהלים', icon: 'business_center', iconBg: 'bg-primary-fixed', iconColor: 'text-primary', barColor: 'bg-primary-container' },
  education_fund: { typeHe: 'קרן השתלמות', icon: 'school', iconBg: 'bg-surface-container-high', iconColor: 'text-on-surface-variant', barColor: 'bg-on-surface-variant' },
  general: { typeHe: 'כללי', icon: 'home', iconBg: 'bg-tertiary-fixed', iconColor: 'text-on-tertiary-container', barColor: 'bg-on-tertiary-container' },
  provident_fund: { typeHe: 'קופת גמל', icon: 'savings', iconBg: 'bg-surface-container-high', iconColor: 'text-primary', barColor: 'bg-primary' },
};

const COMMISSION_TYPE_HE: Record<string, string> = {
  one_time: 'חד-פעמית',
  recurring: 'שוטפת',
  volume: 'היקף',
  bonus: 'בונוס',
};

const REPORT_TYPE_HE: Record<string, string> = {
  nifraim: 'נפרעים',
  hekef: 'היקף',
  agent_data: 'צבירה (פירוט)',
  accumulation_nifraim: 'נפרעים צבירה',
  accumulation_hekef: 'היקף צבירה',
  product_distribution: 'סיכום תשלום',
};

function getInitials(name: string): string {
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2);
}

function recalcDerived(policies: PolicyRow[], commissions: CommissionRow[]) {
  const totalCommissions = commissions.reduce((s, c) => s + c.amount, 0);

  const carrierMap: Record<string, number> = {};
  for (const c of commissions) {
    carrierMap[c.insuranceCompany] = (carrierMap[c.insuranceCompany] || 0) + c.amount;
  }
  const carrierCommissions = Object.entries(carrierMap)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const typeMap: Record<string, number> = {};
  for (const c of commissions) {
    const p = policies.find((pol) => pol.id === c.policyId || pol.clientName === c.clientName);
    const type = p?.productType || 'general';
    typeMap[type] = (typeMap[type] || 0) + c.amount;
  }
  const totalAmt = Object.values(typeMap).reduce((s, v) => s + v, 0) || 1;
  const policyBreakdown = Object.entries(typeMap)
    .map(([type, amount]) => ({
      type,
      ...(PRODUCT_TYPE_MAP[type] || PRODUCT_TYPE_MAP['general']),
      amount: Math.round(amount),
      pct: Math.round((amount / totalAmt) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  const dashboard: DashboardStats = {
    currentSalary: Math.round(totalCommissions),
    predictedSalary: Math.round(totalCommissions * 1.54),
    growthPct: policies.length > 0 ? 12 : 0,
    newPolicies: policies.length,
    conversionRate: policies.length > 0 ? 28.4 : 0,
    avgProcessingDays: policies.length > 0 ? 4.2 : 0,
    bonusTarget: 50,
    bonusCurrent: policies.length,
    bonusAmount: 5000,
  };

  const targetProgress = policies.length > 0 ? Math.min(100, Math.round((totalCommissions / 168000) * 100)) : 0;
  const projectedTotal = Math.round(totalCommissions * 1.54);

  return { totalCommissions: Math.round(totalCommissions), carrierCommissions, policyBreakdown, dashboard, targetProgress, projectedTotal };
}

// ─── Map API types to UI types ───────────────────────────────
function mapApiPolicy(p: api.Policy): PolicyRow {
  const meta = PRODUCT_TYPE_MAP[p.productType] || PRODUCT_TYPE_MAP['general'];
  return {
    id: p.id,
    clientName: p.clientName,
    clientInitials: getInitials(p.clientName),
    productType: p.productType,
    productTypeHe: meta.typeHe,
    insuranceCompany: p.insuranceCompany,
    startDate: new Date(p.startDate).toLocaleDateString('he-IL'),
    premiumAmount: p.premiumAmount,
    commissionPct: p.commissionPct,
    recurringPct: p.recurringPct,
    commissionAmount: Math.round(p.premiumAmount * (p.commissionPct / 100)),
    status: p.status === 'suspended' ? 'pending' : p.status as PolicyRow['status'],
  };
}

function mapApiCommission(c: api.Commission): CommissionRow {
  const d = new Date(c.paymentDate);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return {
    id: c.id,
    policyId: c.policyId,
    clientName: '',
    clientInitials: '',
    type: c.type,
    typeHe: COMMISSION_TYPE_HE[c.type] || c.type,
    amount: c.amount,
    insuranceCompany: c.insuranceCompany,
    date: d.toLocaleDateString('he-IL'),
    processingMonth: `${y}-${m}`,
    productTypeHe: '',
  };
}

function mapApiUpload(u: api.UploadRecord): UploadRow {
  return {
    id: u.id,
    fileName: u.fileName,
    company: u.insuranceCompany,
    date: new Date(u.uploadDate).toLocaleDateString('he-IL'),
    records: u.recordCount,
    status: u.status,
  };
}

// Enrich commissions with client info from policies
function enrichCommissions(commissions: CommissionRow[], policies: PolicyRow[]): CommissionRow[] {
  const policyMap = new Map(policies.map((p) => [p.id, p]));
  return commissions.map((c) => {
    const policy = policyMap.get(c.policyId);
    if (policy) {
      return {
        ...c,
        clientName: policy.clientName,
        clientInitials: policy.clientInitials,
        productTypeHe: policy.productTypeHe,
      };
    }
    return c;
  });
}

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_COMMISSIONS: CommissionRow[] = [
  { id: '1', policyId: '1', clientName: 'ישראל שראבי', clientInitials: 'יש', type: 'one_time', typeHe: 'חד-פעמית', amount: 1860, insuranceCompany: 'הראל', date: '14/01/2026', processingMonth: '2026-01', productTypeHe: 'ביטוח מנהלים' },
  { id: '2', policyId: '2', clientName: 'מרים רפאלי', clientInitials: 'מר', type: 'one_time', typeHe: 'חד-פעמית', amount: 1230, insuranceCompany: 'מגדל', date: '12/01/2026', processingMonth: '2026-01', productTypeHe: 'פנסיה מקיפה' },
  { id: '3', policyId: '3', clientName: 'דניאל גולדשטיין', clientInitials: 'דג', type: 'one_time', typeHe: 'חד-פעמית', amount: 525, insuranceCompany: 'הפניקס', date: '10/01/2026', processingMonth: '2026-01', productTypeHe: 'ביטוח בריאות' },
  { id: '4', policyId: '4', clientName: 'אילנה לוי', clientInitials: 'אל', type: 'one_time', typeHe: 'חד-פעמית', amount: 2250, insuranceCompany: 'כלל', date: '09/01/2026', processingMonth: '2026-01', productTypeHe: 'קרן השתלמות' },
  { id: '5', policyId: '5', clientName: 'יוסף חדד', clientInitials: 'יח', type: 'one_time', typeHe: 'חד-פעמית', amount: 1470, insuranceCompany: 'מנורה מבטחים', date: '07/01/2026', processingMonth: '2026-01', productTypeHe: 'ביטוח חיים' },
  { id: '6', policyId: '6', clientName: 'שרה כהן', clientInitials: 'שכ', type: 'one_time', typeHe: 'חד-פעמית', amount: 1320, insuranceCompany: 'הראל', date: '05/02/2026', processingMonth: '2026-02', productTypeHe: 'פנסיה' },
  { id: '7', policyId: '7', clientName: 'משה ביטון', clientInitials: 'מב', type: 'one_time', typeHe: 'חד-פעמית', amount: 650, insuranceCompany: 'הפניקס', date: '15/02/2026', processingMonth: '2026-02', productTypeHe: 'ביטוח כללי' },
  { id: '8', policyId: '8', clientName: 'רחל אברהם', clientInitials: 'רא', type: 'one_time', typeHe: 'חד-פעמית', amount: 756, insuranceCompany: 'מגדל', date: '01/03/2026', processingMonth: '2026-03', productTypeHe: 'ביטוח בריאות' },
  { id: '9', policyId: '9', clientName: 'אברהם דוד', clientInitials: 'אד', type: 'one_time', typeHe: 'חד-פעמית', amount: 2590, insuranceCompany: 'כלל', date: '10/03/2026', processingMonth: '2026-03', productTypeHe: 'ביטוח מנהלים' },
  { id: '10', policyId: '10', clientName: 'נועה פרידמן', clientInitials: 'נפ', type: 'one_time', typeHe: 'חד-פעמית', amount: 1248, insuranceCompany: 'הראל', date: '20/03/2026', processingMonth: '2026-03', productTypeHe: 'ביטוח חיים' },
];

const DEMO_POLICIES: PolicyRow[] = [
  { id: '1', clientName: 'ישראל שראבי', clientInitials: 'יש', productType: 'managers_insurance', productTypeHe: 'ביטוח מנהלים', insuranceCompany: 'הראל', startDate: '14/01/2026', premiumAmount: 12400, commissionPct: 15, recurringPct: 2, commissionAmount: 1860, status: 'active' },
  { id: '2', clientName: 'מרים רפאלי', clientInitials: 'מר', productType: 'pension', productTypeHe: 'פנסיה מקיפה', insuranceCompany: 'מגדל', startDate: '12/01/2026', premiumAmount: 8200, commissionPct: 15, recurringPct: 1.5, commissionAmount: 1230, status: 'active' },
  { id: '3', clientName: 'דניאל גולדשטיין', clientInitials: 'דג', productType: 'health', productTypeHe: 'ביטוח בריאות', insuranceCompany: 'הפניקס', startDate: '10/01/2026', premiumAmount: 3500, commissionPct: 15, recurringPct: 3, commissionAmount: 525, status: 'active' },
  { id: '4', clientName: 'אילנה לוי', clientInitials: 'אל', productType: 'education_fund', productTypeHe: 'קרן השתלמות', insuranceCompany: 'כלל', startDate: '09/01/2026', premiumAmount: 15000, commissionPct: 15, recurringPct: 1, commissionAmount: 2250, status: 'active' },
  { id: '5', clientName: 'יוסף חדד', clientInitials: 'יח', productType: 'life_insurance', productTypeHe: 'ביטוח חיים', insuranceCompany: 'מנורה מבטחים', startDate: '07/01/2026', premiumAmount: 9800, commissionPct: 15, recurringPct: 2.5, commissionAmount: 1470, status: 'active' },
  { id: '6', clientName: 'שרה כהן', clientInitials: 'שכ', productType: 'pension', productTypeHe: 'פנסיה', insuranceCompany: 'הראל', startDate: '05/02/2026', premiumAmount: 11000, commissionPct: 12, recurringPct: 1.5, commissionAmount: 1320, status: 'active' },
  { id: '7', clientName: 'משה ביטון', clientInitials: 'מב', productType: 'general', productTypeHe: 'ביטוח כללי', insuranceCompany: 'הפניקס', startDate: '15/02/2026', premiumAmount: 6500, commissionPct: 10, recurringPct: 0, commissionAmount: 650, status: 'active' },
  { id: '8', clientName: 'רחל אברהם', clientInitials: 'רא', productType: 'health', productTypeHe: 'ביטוח בריאות', insuranceCompany: 'מגדל', startDate: '01/03/2026', premiumAmount: 4200, commissionPct: 18, recurringPct: 3, commissionAmount: 756, status: 'active' },
  { id: '9', clientName: 'אברהם דוד', clientInitials: 'אד', productType: 'managers_insurance', productTypeHe: 'ביטוח מנהלים', insuranceCompany: 'כלל', startDate: '10/03/2026', premiumAmount: 18500, commissionPct: 14, recurringPct: 2, commissionAmount: 2590, status: 'active' },
  { id: '10', clientName: 'נועה פרידמן', clientInitials: 'נפ', productType: 'life_insurance', productTypeHe: 'ביטוח חיים', insuranceCompany: 'הראל', startDate: '20/03/2026', premiumAmount: 7800, commissionPct: 16, recurringPct: 2.5, commissionAmount: 1248, status: 'active' },
];

const DEMO_UPLOADS: UploadRow[] = [
  { id: '1', fileName: 'commissions_harel_0326.csv', company: 'הראל', date: '12/03/2026', records: 1240, status: 'completed' },
  { id: '2', fileName: 'migdal_ledger_q1.csv', company: 'מגדל', date: '08/03/2026', records: 842, status: 'completed' },
  { id: '3', fileName: 'error_report_phoenix.csv', company: 'הפניקס', date: '01/03/2026', records: 0, status: 'error' },
  { id: '4', fileName: 'menora_monthly_feb.csv', company: 'מנורה מבטחים', date: '25/02/2026', records: 654, status: 'completed' },
];

const EMPTY_DASHBOARD: DashboardStats = {
  currentSalary: 0,
  predictedSalary: 0,
  growthPct: 0,
  newPolicies: 0,
  conversionRate: 0,
  avgProcessingDays: 0,
  bonusTarget: 50,
  bonusCurrent: 0,
  bonusAmount: 3000,
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      policies: [],
      commissions: [],
      uploads: [],
      dashboard: EMPTY_DASHBOARD,
      carrierCommissions: [],
      policyBreakdown: [],
      totalCommissions: 0,
      targetProgress: 0,
      projectedTotal: 0,
      loading: false,
      error: null,

      loadData: (mode) => {
        if (mode === 'demo') {
          const derived = recalcDerived(DEMO_POLICIES, DEMO_COMMISSIONS);
          set({
            policies: DEMO_POLICIES,
            commissions: DEMO_COMMISSIONS,
            uploads: DEMO_UPLOADS,
            loading: false,
            error: null,
            ...derived,
          });
        } else {
          set({
            policies: [],
            commissions: [],
            uploads: [],
            dashboard: EMPTY_DASHBOARD,
            carrierCommissions: [],
            policyBreakdown: [],
            totalCommissions: 0,
            targetProgress: 0,
            projectedTotal: 0,
            loading: false,
            error: null,
          });
        }
      },

      fetchFromApi: async () => {
        set({ loading: true, error: null });
        try {
          const [policiesRes, commissionsRes, uploadsRes, summaryRes] = await Promise.all([
            api.getPolicies({ limit: 100 }),
            api.getCommissions({ limit: 100 }),
            api.getUploads({ limit: 50 }),
            api.getCommissionSummary(),
          ]);

          const policies = (policiesRes.data || []).map(mapApiPolicy);
          let commissions = (commissionsRes.data || []).map(mapApiCommission);
          const uploads = (uploadsRes.data || []).map(mapApiUpload);

          // Enrich commissions with client info from policies
          commissions = enrichCommissions(commissions, policies);

          const derived = recalcDerived(policies, commissions);

          // Override dashboard with API summary if available
          const summary = summaryRes.data;
          if (summary) {
            derived.dashboard = {
              ...derived.dashboard,
              currentSalary: Math.round(summary.grossTotal),
              newPolicies: summary.newPolicies,
              conversionRate: summary.conversionRate,
            };
          }

          set({
            policies,
            commissions,
            uploads,
            loading: false,
            error: null,
            ...derived,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'שגיאה בטעינת נתונים';
          set({ loading: false, error: message });
        }
      },

      addPolicy: (policy) => {
        // Derive processingMonth from startDate (DD/MM/YYYY or YYYY-MM)
        let processingMonth = '';
        if (/^\d{4}-\d{2}$/.test(policy.startDate)) {
          processingMonth = policy.startDate;
        } else {
          const parts = policy.startDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
          if (parts) processingMonth = `${parts[3]}-${parts[2].padStart(2, '0')}`;
        }

        const commission: CommissionRow = {
          id: crypto.randomUUID(),
          policyId: policy.id,
          clientName: policy.clientName,
          clientInitials: policy.clientInitials,
          type: 'one_time',
          typeHe: 'חד-פעמית',
          amount: policy.commissionAmount,
          insuranceCompany: policy.insuranceCompany,
          date: policy.startDate,
          processingMonth,
          productTypeHe: policy.productTypeHe,
        };

        const newPolicies = [policy, ...get().policies];
        const newCommissions = [commission, ...get().commissions];
        const derived = recalcDerived(newPolicies, newCommissions);

        set({
          policies: newPolicies,
          commissions: newCommissions,
          ...derived,
        });
      },

      addCommission: (commission) => {
        const newCommissions = [commission, ...get().commissions];
        const derived = recalcDerived(get().policies, newCommissions);
        set({ commissions: newCommissions, ...derived });
      },

      addCommissionsBatch: (batch) => {
        const newCommissions = [...batch, ...get().commissions];
        const derived = recalcDerived(get().policies, newCommissions);
        set({ commissions: newCommissions, ...derived });
      },

      addUpload: (upload) => set((state) => ({ uploads: [upload, ...state.uploads] })),

      loadSalesFromDb: async () => {
        set({ loading: true, error: null });
        try {
          const [salesRes, summaryRes] = await Promise.all([
            api.getSalesTransactions(),
            api.getSalesSummary(),
          ]);

          const salesData = salesRes.data || [];
          const summaryData = summaryRes.data || [];

          // Map DB sales_transactions to CommissionRow[]
          const commissions: CommissionRow[] = salesData.map((s) => {
            const clientName = s.insuredName || '';
            return {
              id: s.id,
              policyId: s.policyNumber || '',
              clientName,
              clientInitials: clientName.trim().split(' ').map((w: string) => w[0] || '').join('').slice(0, 2),
              type: s.reportType === 'hekef' || s.reportType === 'accumulation_hekef' ? 'one_time' : 'recurring',
              typeHe: REPORT_TYPE_HE[s.reportType] || s.reportType,
              amount: s.commissionAmount,
              insuranceCompany: s.insuranceCompany,
              date: s.processingMonth,
              processingMonth: s.processingMonth,
              productTypeHe: s.productName || s.branch || s.fundType || '',
              clientIdNumber: s.insuredId || '',
              branch: s.branch || '',
              premiumAmount: s.premium ?? 0,
            };
          });

          // Debug: log loaded months
          const monthCounts: Record<string, number> = {};
          commissions.forEach(c => { monthCounts[c.processingMonth] = (monthCounts[c.processingMonth] || 0) + 1; });
          console.log('[loadSalesFromDb] Loaded from DB:', commissions.length, 'records, months:', monthCounts);

          const derived = recalcDerived(get().policies, commissions);

          // Update dashboard with summary totals
          const totalFromSummary = summaryData.reduce((sum, m) => sum + m.totalCommission, 0);
          const totalRecords = summaryData.reduce((sum, m) => sum + m.recordCount, 0);
          if (totalFromSummary > 0) {
            derived.dashboard = {
              ...derived.dashboard,
              currentSalary: Math.round(totalFromSummary),
              newPolicies: totalRecords,
            };
          }

          set({
            commissions,
            loading: false,
            error: null,
            ...derived,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'שגיאה בטעינת נתונים מהשרת';
          set({ loading: false, error: message });
        }
      },
    }),
    {
      name: 'agora-data',
      // Don't persist commissions — they are loaded from DB on mount
      // Only persist uploads list for display purposes
      partialize: (state) => ({
        policies: state.policies,
        uploads: state.uploads,
        totalCommissions: state.totalCommissions,
        targetProgress: state.targetProgress,
        projectedTotal: state.projectedTotal,
      }),
    },
  ),
);

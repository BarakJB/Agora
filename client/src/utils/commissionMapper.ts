import type { CommissionRow } from '../store/dataStore';
import type * as api from '../services/api';

export const REPORT_TYPE_HE: Record<string, string> = {
  nifraim: 'נפרעים',
  hekef: 'היקף',
  agent_data: 'צבירה (פירוט)',
  accumulation_nifraim: 'נפרעים צבירה',
  accumulation_hekef: 'היקף צבירה',
  product_distribution: 'סיכום תשלום',
  branch_distribution: 'היקף',
};

export function mapToCommissionRow(s: api.SalesTransaction): CommissionRow {
  const name = s.insuredName || '';
  return {
    id: s.id,
    policyId: s.policyNumber || '',
    clientName: name,
    clientInitials: name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2),
    type: (s.reportType === 'hekef' || s.reportType === 'accumulation_hekef') ? 'one_time' : 'recurring',
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
}

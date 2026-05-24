import type { CommissionRow } from '../store/dataStore';
import { formatMonth, fmt } from './dateFormat';

export interface AnomalyClient {
  name: string;
  id: string;
  amount: number;
  product: string;
  policyNumber?: string;
  insuranceCompany?: string;
}

export interface Anomaly {
  type: 'total_drop' | 'client_lost' | 'client_negative' | 'client_spike' | 'total_spike' | 'policy_lost';
  severity: 'high' | 'medium' | 'low';
  icon: string;
  message: string;
  detail: string;
  clients?: AnomalyClient[];
  month: string;
}

function normalizeClientKey(row: CommissionRow): string | null {
  if (row.clientIdNumber && row.clientIdNumber.trim()) {
    return row.clientIdNumber.trim();
  }
  const name = row.clientName?.trim().replace(/\s+/g, ' ');
  if (name) return name;
  return null;
}

function normalizePolicyKey(row: CommissionRow): string | null {
  const p = row.policyId?.trim();
  return p || null;
}

interface ClientAggregate {
  name: string;
  id: string;
  amount: number;
  products: Set<string>;
  policies: Set<string>;
  companies: Set<string>;
}

interface PolicyAggregate {
  clientName: string;
  clientId: string;
  policyNumber: string;
  amount: number;
  product: string;
  company: string;
}

function buildClientAndPolicyMaps(rows: CommissionRow[]): {
  clientMap: Map<string, ClientAggregate>;
  policyMap: Map<string, PolicyAggregate>;
} {
  const clientMap = new Map<string, ClientAggregate>();
  const policyMap = new Map<string, PolicyAggregate>();

  for (const c of rows) {
    const clientKey = normalizeClientKey(c);
    if (!clientKey) continue;

    const existing = clientMap.get(clientKey);
    const product = c.productTypeHe || c.branch || '';
    const policyKey = normalizePolicyKey(c);

    if (existing) {
      existing.amount += c.amount;
      if (product) existing.products.add(product);
      if (policyKey) existing.policies.add(policyKey);
      if (c.insuranceCompany) existing.companies.add(c.insuranceCompany);
    } else {
      const products = new Set<string>();
      if (product) products.add(product);
      const policies = new Set<string>();
      if (policyKey) policies.add(policyKey);
      const companies = new Set<string>();
      if (c.insuranceCompany) companies.add(c.insuranceCompany);
      clientMap.set(clientKey, {
        name: c.clientName,
        id: c.clientIdNumber || '',
        amount: c.amount,
        products,
        policies,
        companies,
      });
    }

    if (policyKey) {
      const compositeKey = `${clientKey}|${policyKey}`;
      const existingPolicy = policyMap.get(compositeKey);
      if (existingPolicy) {
        existingPolicy.amount += c.amount;
      } else {
        policyMap.set(compositeKey, {
          clientName: c.clientName,
          clientId: c.clientIdNumber || '',
          policyNumber: policyKey,
          amount: c.amount,
          product,
          company: c.insuranceCompany,
        });
      }
    }
  }

  return { clientMap, policyMap };
}

export function detectAnomalies(commissions: CommissionRow[], availableMonths: string[]): Anomaly[] {
  if (availableMonths.length < 2) return [];
  const alerts: Anomaly[] = [];

  const nifraimMonths = availableMonths.filter(m =>
    commissions.some(c => c.processingMonth === m && c.typeHe === 'נפרעים')
  );

  for (let i = 1; i < nifraimMonths.length; i++) {
    const currMonth = nifraimMonths[i];
    const prevMonth = nifraimMonths[i - 1];
    const currNifraim = commissions.filter(c => c.processingMonth === currMonth && c.typeHe === 'נפרעים');
    const prevNifraim = commissions.filter(c => c.processingMonth === prevMonth && c.typeHe === 'נפרעים');

    if (prevNifraim.length === 0 || currNifraim.length === 0) continue;

    const currTotal = currNifraim.reduce((s, c) => s + c.amount, 0);
    const prevTotal = prevNifraim.reduce((s, c) => s + c.amount, 0);

    if (prevTotal > 0 && currTotal < prevTotal * 0.9) {
      const dropPct = Math.round(((prevTotal - currTotal) / prevTotal) * 100);
      alerts.push({
        type: 'total_drop',
        severity: dropPct > 20 ? 'high' : 'medium',
        icon: 'trending_down',
        message: `ירידה בנפרעים: ${formatMonth(prevMonth)} → ${formatMonth(currMonth)}`,
        detail: `${fmt(Math.round(prevTotal))}₪ → ${fmt(Math.round(currTotal))}₪ (ירידה של ${dropPct}%). נפרעים צפויים לעלות עם הצטרפות לקוחות חדשים.`,
        month: currMonth,
      });
    }

    const { clientMap: prevClientMap, policyMap: prevPolicyMap } = buildClientAndPolicyMaps(prevNifraim);
    const { clientMap: currClientMap, policyMap: currPolicyMap } = buildClientAndPolicyMaps(currNifraim);

    const lostClients: AnomalyClient[] = [];
    const lostPolicies: AnomalyClient[] = [];

    prevClientMap.forEach((prevData, clientKey) => {
      if (!currClientMap.has(clientKey)) {
        if (prevData.amount >= 10) {
          const firstPolicy = Array.from(prevData.policies)[0];
          const firstCompany = Array.from(prevData.companies)[0];
          lostClients.push({
            name: prevData.name,
            id: prevData.id,
            amount: prevData.amount,
            product: Array.from(prevData.products).join(', ') || '—',
            policyNumber: firstPolicy,
            insuranceCompany: firstCompany,
          });
        }
        return;
      }

      prevPolicyMap.forEach((prevPolicy, compositeKey) => {
        if (!compositeKey.startsWith(`${clientKey}|`)) return;
        if (currPolicyMap.has(compositeKey)) return;
        if (!currClientMap.has(clientKey)) return;
        if (prevPolicy.amount < 10) return;

        lostPolicies.push({
          name: prevPolicy.clientName,
          id: prevPolicy.clientId,
          amount: prevPolicy.amount,
          product: prevPolicy.product || '—',
          policyNumber: prevPolicy.policyNumber,
          insuranceCompany: prevPolicy.company,
        });
      });
    });

    if (lostClients.length > 0) {
      const totalLost = lostClients.reduce((s, c) => s + c.amount, 0);
      alerts.push({
        type: 'client_lost',
        severity: totalLost > 100 ? 'high' : 'medium',
        icon: 'person_off',
        message: `${lostClients.length} לקוחות לא מופיעים ב${formatMonth(currMonth)}`,
        detail: `אובדן הכנסה של ${fmt(Math.round(totalLost))}₪`,
        clients: lostClients.sort((a, b) => b.amount - a.amount),
        month: currMonth,
      });
    }

    if (lostPolicies.length > 0) {
      const totalLost = lostPolicies.reduce((s, c) => s + c.amount, 0);
      alerts.push({
        type: 'policy_lost',
        severity: totalLost > 100 ? 'high' : 'medium',
        icon: 'description',
        message: `${lostPolicies.length} פוליסות לא מופיעות ב${formatMonth(currMonth)}`,
        detail: `פוליסות של לקוחות קיימים שנעלמו — ייתכן מעבר. אובדן פוטנציאלי: ${fmt(Math.round(totalLost))}₪`,
        clients: lostPolicies.sort((a, b) => b.amount - a.amount),
        month: currMonth,
      });
    }

    const droppedClients: AnomalyClient[] = [];
    prevClientMap.forEach((prevData, clientKey) => {
      const currData = currClientMap.get(clientKey);
      if (!currData) return;

      const prevPoliciesSet = prevData.policies;
      const currPoliciesSet = currData.policies;
      const allPoliciesChanged =
        prevPoliciesSet.size > 0 &&
        currPoliciesSet.size > 0 &&
        Array.from(prevPoliciesSet).every(p => !currPoliciesSet.has(p));
      if (allPoliciesChanged) return;

      const drop = prevData.amount - currData.amount;
      if (drop >= 20) {
        const firstPolicy = Array.from(currData.policies)[0];
        droppedClients.push({
          name: prevData.name,
          id: prevData.id,
          amount: -drop,
          product: `${fmt(Math.round(prevData.amount))}₪ → ${fmt(Math.round(currData.amount))}₪ (${Array.from(currData.products).join(', ') || '—'})`,
          policyNumber: firstPolicy,
        });
      }
    });

    if (droppedClients.length > 0) {
      const totalDrop = droppedClients.reduce((s, c) => s + Math.abs(c.amount), 0);
      alerts.push({
        type: 'client_spike',
        severity: totalDrop > 200 ? 'high' : droppedClients.length > 3 ? 'medium' : 'low',
        icon: 'person_alert',
        message: `${droppedClients.length} לקוחות עם ירידה מ${formatMonth(prevMonth)} ל${formatMonth(currMonth)}`,
        detail: `לקוחות שההכנסה מהם ירדה ב-20₪ ומעלה. סה"כ ירידה: ${fmt(Math.round(totalDrop))}₪`,
        clients: droppedClients.sort((a, b) => a.amount - b.amount),
        month: currMonth,
      });
    }

    const negatives = currNifraim.filter(c => c.amount < 0);
    if (negatives.length > 0) {
      const totalNeg = negatives.reduce((s, c) => s + c.amount, 0);
      const negClients: AnomalyClient[] = negatives.map(c => ({
        name: c.clientName,
        id: c.clientIdNumber || '',
        amount: c.amount,
        product: c.productTypeHe || c.branch || '—',
        policyNumber: normalizePolicyKey(c) ?? undefined,
        insuranceCompany: c.insuranceCompany,
      }));
      alerts.push({
        type: 'client_negative',
        severity: Math.abs(totalNeg) > 50 ? 'high' : 'low',
        icon: 'warning',
        message: `${negatives.length} החזרים/ביטולים ב${formatMonth(currMonth)}`,
        detail: `סה"כ ${fmt(Math.round(Math.abs(totalNeg)))}₪ בהחזרים`,
        clients: negClients.sort((a, b) => a.amount - b.amount),
        month: currMonth,
      });
    }
  }

  for (const month of availableMonths) {
    const monthNifraim = commissions.filter(c => c.processingMonth === month && c.typeHe === 'נפרעים');
    if (nifraimMonths.length >= 2 && nifraimMonths.includes(month) && nifraimMonths.indexOf(month) > 0) continue;

    const negatives = monthNifraim.filter(c => c.amount < 0);
    if (negatives.length > 0) {
      const totalNeg = negatives.reduce((s, c) => s + c.amount, 0);
      const negClients: AnomalyClient[] = negatives.map(c => ({
        name: c.clientName,
        id: c.clientIdNumber || '',
        amount: c.amount,
        product: c.productTypeHe || c.branch || '—',
        policyNumber: normalizePolicyKey(c) ?? undefined,
        insuranceCompany: c.insuranceCompany,
      }));
      alerts.push({
        type: 'client_negative',
        severity: Math.abs(totalNeg) > 50 ? 'high' : 'low',
        icon: 'warning',
        message: `${negatives.length} החזרים/ביטולים ב${formatMonth(month)}`,
        detail: `סה"כ ${fmt(Math.round(Math.abs(totalNeg)))}₪ בהחזרים`,
        clients: negClients.sort((a, b) => a.amount - b.amount),
        month: month,
      });
    }
  }

  return alerts.sort((a, b) => {
    const sev: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sevDiff = sev[a.severity] - sev[b.severity];
    if (sevDiff !== 0) return sevDiff;
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    return a.type.localeCompare(b.type);
  });
}

export function anomalyKey(a: Anomaly, index: number): string {
  return `${a.month}-${a.type}-${a.severity}-${index}`;
}

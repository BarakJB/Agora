import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/ui/Icon';
import CompanyLogo from '../components/common/CompanyLogo';
import PortfolioFilterToggle from '../components/common/PortfolioFilterToggle';
import { usePortfolioFilterStore } from '../store/portfolioFilterStore';
import { salesApi } from '../services/api';
import type { CompanyBreakdown, CompanyProductBreakdownResponse } from '../services/api';
import { ApiError } from '../services/api';
import { fmt, formatMonth } from '../utils/dateFormat';

function MonthInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface"
      />
    </div>
  );
}

function exportToCsv(data: CompanyProductBreakdownResponse) {
  const rows: string[] = ['חברה,ענף,מוצר,נפרעים,היקף,צבירה,סה"כ,% מהחברה'];
  for (const company of data.companies) {
    for (const p of company.products) {
      rows.push([
        company.company,
        p.branch,
        p.product,
        p.nifraimAmount,
        p.hekefAmount,
        p.accumulationAmount,
        p.totalCommission,
        `${p.pctOfCompany.toFixed(1)}%`,
      ].join(','));
    }
  }
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'פירוט_הכנסות.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function CompanyCard({ company, grandTotal }: { company: CompanyBreakdown; grandTotal: number }) {
  const [expanded, setExpanded] = useState(false);

  const sortedProducts = [...company.products].sort((a, b) => b.totalCommission - a.totalCommission);

  return (
    <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors"
        aria-expanded={expanded}
        aria-label={`${company.company} — לחץ להרחבה`}
      >
        <div className="flex items-center gap-3">
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            size="sm"
            className="text-on-surface-variant"
          />
          <CompanyLogo company={company.company} size="sm" />
          <span className="font-bold text-on-surface">{company.company}</span>
          <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
            {company.products.length} מוצרים
          </span>
        </div>
        <div className="flex items-center gap-6 text-end">
          <div className="hidden sm:block">
            <p className="text-[10px] text-on-surface-variant mb-0.5">ממוצע חודשי</p>
            <p className="text-sm font-bold text-on-surface">{fmt(Math.round(company.monthlyAverage))} &#8362;</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] text-on-surface-variant mb-0.5">% מהכלל</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(company.pctOfTotal, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary">{company.pctOfTotal.toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant mb-0.5">סה"כ</p>
            <p className="text-lg font-black font-headline text-primary">{fmt(Math.round(company.totalCommission))} &#8362;</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-outline-variant/20 overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <caption className="sr-only">מוצרים — {company.company}</caption>
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline bg-surface-container-low">
                <th className="px-6 py-3 text-start font-black">ענף</th>
                <th className="px-4 py-3 text-start font-black">מוצר</th>
                <th className="px-4 py-3 text-end font-black">נפרעים</th>
                <th className="px-4 py-3 text-end font-black">היקף</th>
                <th className="px-4 py-3 text-end font-black">צבירה</th>
                <th className="px-4 py-3 text-end font-black">סה"כ</th>
                <th className="px-4 py-3 text-end font-black">% מהחברה</th>
              </tr>
            </thead>
            <tbody className="bg-surface-container-lowest">
              {sortedProducts.map((product, idx) => (
                <tr key={idx} className="border-t border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">{product.branch || '—'}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{product.product || '—'}</td>
                  <td className="px-4 py-3 text-end text-on-surface-variant">
                    {product.nifraimAmount > 0 ? `${fmt(Math.round(product.nifraimAmount))}₪` : '—'}
                  </td>
                  <td className="px-4 py-3 text-end text-on-surface-variant">
                    {product.hekefAmount > 0 ? `${fmt(Math.round(product.hekefAmount))}₪` : '—'}
                  </td>
                  <td className="px-4 py-3 text-end text-on-surface-variant">
                    {product.accumulationAmount > 0 ? `${fmt(Math.round(product.accumulationAmount))}₪` : '—'}
                  </td>
                  <td className="px-4 py-3 text-end font-bold text-secondary">
                    {fmt(Math.round(product.totalCommission))} &#8362;
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${Math.min(product.pctOfCompany, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-on-surface-variant w-10 text-end">
                        {product.pctOfCompany.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-low border-t border-outline-variant/20">
                <td colSpan={5} className="px-6 py-3 font-bold text-on-surface">סה"כ {company.company}</td>
                <td className="px-4 py-3 text-end font-black text-primary">{fmt(Math.round(company.totalCommission))} &#8362;</td>
                <td className="px-4 py-3 text-end text-xs text-on-surface-variant">
                  {grandTotal > 0 ? `${((company.totalCommission / grandTotal) * 100).toFixed(1)}% מהכלל` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CompanyProductBreakdownPage() {
  const portfolioFilter = usePortfolioFilterStore((s) => s.portfolioFilter);

  const now = new Date();
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultFrom = `${now.getFullYear()}-01`;

  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth, setToMonth] = useState(defaultTo);
  const [data, setData] = useState<CompanyProductBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesApi.getCompanyProductBreakdown({
        fromMonth: fromMonth || undefined,
        toMonth: toMonth || undefined,
        portfolioType: portfolioFilter,
      });
      setData(res.data);
    } catch (err) {
      const msg = err instanceof ApiError ? (err.serverError ?? err.message) : 'שגיאה בטעינת נתונים';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fromMonth, toMonth, portfolioFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedCompanies = data ? [...data.companies].sort((a, b) => b.totalCommission - a.totalCommission) : [];

  const rangeLabel = fromMonth && toMonth
    ? `${formatMonth(fromMonth)} — ${formatMonth(toMonth)}`
    : '';

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl">
      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-1">
            פירוט הכנסות
          </h2>
          <p className="text-on-surface-variant">לפי חברה ומוצר</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <PortfolioFilterToggle />
          {data && data.companies.length > 0 && (
            <button
              onClick={() => exportToCsv(data)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              aria-label="ייצוא ל-CSV"
            >
              <Icon name="download" size="sm" />
              ייצוא CSV
            </button>
          )}
        </div>
      </section>

      <div className="bg-surface-container-lowest rounded-lg p-5 flex flex-wrap items-end gap-4 shadow-editorial-sm">
        <MonthInput label="מחודש" value={fromMonth} onChange={setFromMonth} />
        <MonthInput label="עד חודש" value={toMonth} onChange={setToMonth} />
        <button
          onClick={load}
          disabled={loading}
          className="px-5 py-2.5 bg-primary-container text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          aria-label="עדכון נתונים"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Icon name="refresh" size="sm" />
          )}
          עדכן
        </button>
      </div>

      {data && data.grandTotal > 0 && (
        <div className="bg-secondary-container rounded-lg px-6 py-3 flex justify-between items-center">
          <span className="text-sm font-bold text-on-secondary-container">
            סה"כ {rangeLabel} — {sortedCompanies.length} חברות
          </span>
          <span className="text-xl font-black font-headline text-on-secondary-container">
            {fmt(Math.round(data.grandTotal))} &#8362;
          </span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Icon name="cloud_off" size="xl" className="text-error/40" />
          <p className="font-bold text-on-surface">{error}</p>
          <button
            onClick={load}
            className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm"
          >
            נסה שוב
          </button>
        </div>
      )}

      {!loading && !error && data && sortedCompanies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Icon name="inbox" size="xl" className="text-on-surface-variant/40" />
          <p className="text-on-surface-variant">אין נתונים לטווח החודשים שנבחר</p>
        </div>
      )}

      {!loading && !error && sortedCompanies.length > 0 && (
        <div className="space-y-3">
          {sortedCompanies.map((company) => (
            <CompanyCard key={company.company} company={company} grandTotal={data!.grandTotal} />
          ))}
        </div>
      )}
    </div>
  );
}

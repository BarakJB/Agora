import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { MetricCard } from '../components/common/MetricCard';
import CrossSellTable from '../components/potential/CrossSellTable';
import DormantList from '../components/potential/DormantList';
import UntappedBranchesGrid from '../components/potential/UntappedBranchesGrid';
import EmployerClustersTable from '../components/potential/EmployerClustersTable';
import { salesApi } from '../services/api';
import * as api from '../services/api';
import { formatMonth } from '../utils/dateFormat';
import type { SalesPotentialData } from '../types/potential';
import PortfolioFilterToggle, { PortfolioFilterBanner } from '../components/common/PortfolioFilterToggle';
import { usePortfolioFilterStore } from '../store/portfolioFilterStore';

interface SectionProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  count: number;
  accentColor: string;
  children: React.ReactNode;
}

function PotentialSection({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  count,
  accentColor,
  children,
}: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <Icon name={icon} className={iconColor} size="sm" />
          </div>
          <div>
            <h3 className="font-black text-on-surface text-lg leading-tight">{title}</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{description}</p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 text-sm font-bold px-3 py-1 rounded-full ${accentColor}`}
          aria-label={`${count} פריטים`}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

export default function SalesPotentialPage() {
  const portfolioFilter = usePortfolioFilterStore((s) => s.portfolioFilter);
  const [data, setData] = useState<SalesPotentialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    let cancelled = false;
    setLoading(true);
    setError(null);

    salesApi
      .getSalesPotential(portfolioFilter)
      .then((res) => {
        if (!cancelled && res.data) setData(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof api.ApiError && err.status === 401
              ? 'פג תוקף ההתחברות. יש להתחבר מחדש.'
              : err instanceof Error
              ? err.message
              : 'שגיאה בטעינת נתוני פוטנציאל מכירה';
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(load, [portfolioFilter]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Icon name="cloud_off" size="xl" className="text-error/40 mx-auto" />
          <p className="font-bold text-on-surface">{error}</p>
          <button
            onClick={load}
            className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
          >
            <Icon name="refresh" size="sm" />
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const crossSell = data?.crossSell ?? [];
  const dormant = data?.dormant ?? [];
  const untapped = data?.untappedBranches ?? [];
  const clusters = data?.employerClusters ?? [];
  const meta = data?.meta;

  const totalOpportunities = crossSell.length + dormant.length + untapped.length + clusters.length;

  return (
    <div className="p-4 md:p-8 space-y-10 pb-16" dir="rtl">
      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <Icon name="auto_awesome" className="text-emerald-600" size="sm" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight">
              פוטנציאל מכירה
            </h2>
          </div>
          <p className="text-on-surface-variant">
            הזדמנויות להגדלת התיק שלך
            {meta?.latestMonth && (
              <span className="mr-1 text-on-surface-variant/60">
                — נכון ל{formatMonth(meta.latestMonth)}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PortfolioFilterToggle />
          {totalOpportunities > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Icon name="lightbulb" className="text-emerald-600" size="sm" />
              <span className="text-sm font-bold text-emerald-700">
                {totalOpportunities} הזדמנויות זוהו
              </span>
            </div>
          )}
        </div>
      </section>
      <PortfolioFilterBanner filter={portfolioFilter} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="לקוחות לcross-sell"
          value={String(crossSell.length)}
          icon="hub"
          subtitle="לקוחות עם ענפים חסרים"
        />
        <MetricCard
          title="לקוחות רדומים"
          value={String(dormant.length)}
          icon="person_off"
          subtitle="ללא עמלה בחודשים אחרונים"
          level={dormant.length > 0 ? 'yellow' : 'green'}
        />
        <MetricCard
          title="ענפים תת-מפותחים"
          value={String(untapped.length)}
          icon="trending_up"
          subtitle="ענפים עם פוטנציאל גדילה"
        />
        <MetricCard
          title="אשכולות מעסיקים"
          value={String(clusters.length)}
          icon="business"
          subtitle="קבוצות עובדים מאותו מעסיק"
        />
      </div>

      <div className="space-y-12">
        <PotentialSection
          icon="hub"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
          title="הזדמנויות Cross-Sell"
          description="לקוחות קיימים שאפשר להרחיב לענפים נוספים — הפוטנציאל הגדול ביותר"
          count={crossSell.length}
          accentColor="bg-emerald-100 text-emerald-700"
        >
          <CrossSellTable items={crossSell} />
        </PotentialSection>

        <div className="border-t border-outline-variant/20" role="separator" />

        <PotentialSection
          icon="person_off"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          title="לקוחות רדומים"
          description="לקוחות שעבדת איתם בעבר ולא ראית מהם עמלה — שווה להתקשר"
          count={dormant.length}
          accentColor="bg-amber-100 text-amber-700"
        >
          <DormantList items={dormant} />
        </PotentialSection>

        <div className="border-t border-outline-variant/20" role="separator" />

        <PotentialSection
          icon="trending_up"
          iconColor="text-primary"
          iconBg="bg-primary-fixed"
          title="ענפים תת-מפותחים"
          description="ענפים שיש לך מעט לקוחות — הרשימה מזהה מי מהלקוחות הקיימים מתאים"
          count={untapped.length}
          accentColor="bg-primary-fixed text-primary"
        >
          <UntappedBranchesGrid
            items={untapped}
            agentBranchMix={meta?.agentBranchMix}
          />
        </PotentialSection>

        <div className="border-t border-outline-variant/20" role="separator" />

        <PotentialSection
          icon="business"
          iconColor="text-secondary"
          iconBg="bg-secondary-container/30"
          title="אשכולות מעסיקים"
          description="עובדים מאותו מעסיק — פוטנציאל להרחבה מעסיקית שיטתית"
          count={clusters.length}
          accentColor="bg-secondary-container/40 text-secondary"
        >
          <EmployerClustersTable items={clusters} />
        </PotentialSection>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';

export default function PolicyTrackerPage() {
  const policies = useDataStore((s) => s.policies);
  const carrierCommissions = useDataStore((s) => s.carrierCommissions);
  const policyBreakdown = useDataStore((s) => s.policyBreakdown);
  const totalCommissions = useDataStore((s) => s.totalCommissions);
  const targetProgress = useDataStore((s) => s.targetProgress);
  const projectedTotal = useDataStore((s) => s.projectedTotal);
  const userMode = useAuthStore((s) => s.userMode);
  const loading = useDataStore((s) => s.loading);
  const fetchFromApi = useDataStore((s) => s.fetchFromApi);

  const isEmpty = userMode === 'new' && policies.length === 0;
  const fmt = (n: number) => n.toLocaleString('he-IL');
  const maxCarrier = carrierCommissions.length > 0 ? carrierCommissions[0].amount : 1;

  useEffect(() => {
    if (userMode === 'new' && policies.length === 0) {
      fetchFromApi();
    }
  }, [userMode, policies.length, fetchFromApi]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="text-on-surface-variant font-medium">טוען פוליסות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero: Total Commission */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative overflow-hidden rounded-lg editorial-gradient p-10 text-on-primary flex flex-col justify-between min-h-[320px]">
          <div className="z-10">
            <p className="font-label text-on-primary-container text-xs font-bold uppercase tracking-widest mb-2">
              סה״כ עמלות בתיק
            </p>
            <h3 className="font-headline text-3xl md:text-6xl font-black leading-tight">&#8362;{fmt(totalCommissions)}</h3>
          </div>
          <div className="flex justify-between items-end z-10">
            {!isEmpty && (
              <div className="flex gap-2 items-center bg-secondary-container/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Icon name="trending_up" className="text-secondary-fixed-dim" />
                <span className="text-secondary-fixed-dim font-bold">+12.4% מהחודש הקודם</span>
              </div>
            )}
            <button className="px-6 py-3 bg-white text-primary rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all">
              <Icon name="download" />
              הורד דוח PDF
            </button>
          </div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="bg-surface-container-low rounded-lg p-8 flex flex-col justify-center gap-6">
          <div>
            <h4 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">התקדמות יעד</h4>
            <div className="flex mb-2 items-center justify-between">
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-secondary bg-secondary-container">
                {targetProgress >= 80 ? 'בדרך הנכונה' : targetProgress > 0 ? 'בתהליך' : 'התחלה'}
              </span>
              <span className="text-xs font-bold inline-block text-secondary">{targetProgress}%</span>
            </div>
            <div className="overflow-hidden h-2 mb-4 flex rounded bg-surface-variant">
              <div className="bg-secondary transition-all duration-700" style={{ width: `${targetProgress}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs">תחזית לסוף חודש</p>
            <p className="text-2xl font-headline font-bold">&#8362;{fmt(projectedTotal)}</p>
          </div>
        </div>
      </section>

      {/* Policy Breakdown */}
      {policyBreakdown.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold tracking-tight">פילוח לפי סוג פוליסה</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {policyBreakdown.map((p) => (
              <div key={p.type} className="bg-surface-container-lowest p-6 rounded-lg transition-transform hover:scale-[1.01]">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-2 ${p.iconBg} rounded-lg`}>
                    <Icon name={p.icon} className={p.iconColor} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase bg-surface-container-low px-2 py-1 rounded">{p.typeHe}</span>
                </div>
                <p className="text-2xl font-headline font-black mb-1">&#8362;{fmt(p.amount)}</p>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className={`${p.barColor} h-full`} style={{ width: `${p.pct}%` }} />
                </div>
                <p className="text-[10px] mt-2 text-on-surface-variant">{p.pct}% מסך התיק</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {isEmpty && (
        <section className="bg-surface-container-lowest rounded-lg p-16 text-center">
          <Icon name="folder_open" size="xl" className="text-on-surface-variant/20 mb-4" />
          <h3 className="text-xl font-bold text-on-surface mb-2">אין פוליסות עדיין</h3>
          <p className="text-on-surface-variant mb-6">הוסף פוליסה חדשה או העלה קובץ עמלות כדי להתחיל</p>
          <button className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all">
            <Icon name="add" className="inline-block align-middle ml-2" />
            הוסף פוליסה ראשונה
          </button>
        </section>
      )}

      {/* Bottom Row */}
      {!isEmpty && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
          {/* Commission by Carrier */}
          <div className="bg-surface-container-low rounded-lg p-8 space-y-8">
            <h4 className="font-headline text-lg font-bold">עמלות לפי חברת ביטוח</h4>
            <div className="space-y-6">
              {carrierCommissions.map((c) => (
                <div key={c.name} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{c.name}</span>
                    <span>&#8362;{fmt(c.amount)}</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-8 rounded-lg overflow-hidden">
                    <div
                      className="bg-primary-container h-full transition-all duration-500"
                      style={{ width: `${(c.amount / maxCarrier) * 100}%`, opacity: Math.max(0.3, c.amount / maxCarrier) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policies List */}
          <div className="bg-surface-container-lowest rounded-lg p-8">
            <h4 className="font-headline text-lg font-bold mb-8">פוליסות אחרונות</h4>
            <div className="space-y-6">
              {policies.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center">
                      <Icon name="policy" className="text-primary/40" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{p.clientName}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                        {p.insuranceCompany} &bull; {p.productTypeHe}
                      </p>
                    </div>
                  </div>
                  <div className="text-start">
                    <p className="font-headline font-bold text-secondary">&#8362;{fmt(p.commissionAmount)}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{p.startDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

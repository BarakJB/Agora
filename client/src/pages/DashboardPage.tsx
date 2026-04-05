import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const dashboard = useDataStore((s) => s.dashboard);
  const commissions = useDataStore((s) => s.commissions);
  const userMode = useAuthStore((s) => s.userMode);
  const loading = useDataStore((s) => s.loading);
  const error = useDataStore((s) => s.error);
  const fetchFromApi = useDataStore((s) => s.fetchFromApi);

  const isEmpty = userMode === 'new' && commissions.length === 0;
  const fmt = (n: number) => n.toLocaleString('he-IL');

  // Fetch real data from API when not in demo mode
  useEffect(() => {
    if (userMode === 'new') {
      fetchFromApi();
    }
  }, [userMode, fetchFromApi]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="text-on-surface-variant font-medium">טוען נתונים מהשרת...</p>
        </div>
      </div>
    );
  }

  if (error && userMode === 'new') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <Icon name="cloud_off" size="xl" className="text-error/40 mx-auto" />
          <p className="text-on-surface font-bold text-lg">שגיאה בטעינת נתונים</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button
            onClick={() => fetchFromApi()}
            className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Page Heading */}
      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-2">
            תחזית שכר חודשית
          </h2>
          <p className="text-on-surface-variant font-body">
            {isEmpty
              ? 'עדיין אין נתונים — הוסף פוליסות כדי לראות את התחזית שלך'
              : 'סקירה מפורטת של עמלות, בונוסים ויעדי מכירה לאפריל 2026'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high text-on-surface-variant px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all" disabled>
            ייצוא דוח PDF
          </button>
          <button
            className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-editorial-btn hover:translate-y-[-1px] transition-all"
            onClick={() => fetchFromApi()}
          >
            עדכון נתונים
          </button>
        </div>
      </section>

      {/* Summary Cards — compact row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Salary Card */}
        <div className="bg-surface-container-lowest rounded-lg p-5 shadow-editorial relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3 font-headline">
              שכר נצבר נכון להיום
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-black font-headline text-primary">
                {fmt(dashboard.currentSalary)}
              </span>
              <span className="text-lg font-bold text-primary/40">&lrm;&#8362;</span>
            </div>
            {dashboard.growthPct > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-secondary font-semibold text-sm">
                <Icon name="trending_up" size="sm" />
                <span>{dashboard.growthPct}% מעל החודש הקודם</span>
              </div>
            )}
            {isEmpty && (
              <button
                onClick={() => navigate('/upload')}
                className="mt-3 bg-primary-container text-white px-4 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5"
              >
                <Icon name="upload_file" size="sm" />
                העלה קובץ עמלות
              </button>
            )}
          </div>
        </div>

        {/* Predicted Salary Card */}
        <div className="bg-secondary-container rounded-lg p-5 relative overflow-hidden flex items-center">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-secondary-container mb-3 font-headline">
              תחזית לסוף חודש
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-black font-headline text-on-secondary-container">
                {fmt(dashboard.predictedSalary)}
              </span>
              <span className="text-lg font-bold text-on-secondary-container/60">&lrm;&#8362;</span>
            </div>
            <p className="mt-2 text-on-secondary-container/80 font-medium text-xs leading-relaxed">
              {isEmpty
                ? 'התחזית תתעדכן אוטומטית עם הוספת נתונים'
                : 'מבוסס על צבר פוליסות נוכחי ושיעור המרה ממוצע של 24%'}
            </p>
          </div>
          <div className="hidden lg:flex w-14 h-14 bg-white/20 rounded-full backdrop-blur-xl items-center justify-center shrink-0">
            <Icon name="auto_graph" filled className="text-on-secondary-container" size="sm" />
          </div>
        </div>

        {/* Campaign / Bonus Card */}
        <div className="relative rounded-lg overflow-hidden">
          <div className="absolute inset-0 editorial-gradient z-0" />
          <div className="relative z-10 p-5 h-full flex flex-col justify-center">
            <span className="bg-secondary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit mb-2">
              {dashboard.bonusCurrent >= dashboard.bonusTarget ? 'יעד הושג!' : 'מבצע בונוס פעיל'}
            </span>
            <h3 className="text-lg font-black text-white font-headline leading-tight mb-2">
              יעד פוליסות חיים: בונוס {fmt(dashboard.bonusAmount)}&#8362;
            </h3>
            <p className="text-white/70 text-xs mb-3 leading-relaxed">
              {isEmpty
                ? 'התחל להוסיף פוליסות כדי להתקדם ליעד הבונוס שלך'
                : `הגע ל-${dashboard.bonusTarget} פוליסות עד סוף החודש. נשארו ${Math.max(0, dashboard.bonusTarget - dashboard.bonusCurrent)}!`}
            </p>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, (dashboard.bonusCurrent / dashboard.bonusTarget) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-bold text-white/50 tracking-widest uppercase">
              <span>{dashboard.bonusCurrent} בוצעו</span>
              <span>{dashboard.bonusTarget} היעד</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Monthly Metrics */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low rounded-lg p-6 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-headline">
            מדדים חודשיים
          </h3>
          <div className="space-y-4">
            <MetricCard icon="description" iconColor="text-primary" bgColor="bg-primary/10" label="פוליסות חדשות" value={String(dashboard.newPolicies)} />
            <MetricCard icon="analytics" iconColor="text-secondary" bgColor="bg-secondary/10" label="יחס המרה" value={`${dashboard.conversionRate}%`} />
            <MetricCard icon="timer" iconColor="text-on-tertiary-container" bgColor="bg-tertiary-fixed/30" label="זמן טיפול ממוצע" value={dashboard.avgProcessingDays > 0 ? `${dashboard.avgProcessingDays} ימים` : '—'} />
          </div>
        </div>

        {/* Commission Table */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-lg overflow-hidden">
          <div className="px-8 py-6 flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-lg font-black font-headline text-on-surface">
              פירוט עמלות — עסקאות אחרונות
            </h3>
          </div>

          {commissions.length === 0 ? (
            <div className="p-16 text-center">
              <Icon name="receipt_long" size="xl" className="text-on-surface-variant/20 mb-4" />
              <p className="text-on-surface-variant font-medium mb-2">אין עמלות להצגה</p>
              <p className="text-sm text-on-surface-variant/60 mb-6">העלה קובץ עמלות או הוסף פוליסה חדשה</p>
              <button
                onClick={() => navigate('/upload')}
                className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2"
              >
                <Icon name="upload_file" size="sm" />
                העלה קובץ עמלות
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <caption className="sr-only">פירוט עמלות אחרונות</caption>
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline bg-surface-container-low">
                      <th className="px-8 py-4 font-black">לקוח</th>
                      <th className="px-8 py-4 font-black">סוג פוליסה</th>
                      <th className="px-8 py-4 font-black">תאריך</th>
                      <th className="px-8 py-4 font-black">חברה</th>
                      <th className="px-8 py-4 font-black text-start">עמלת סוכן</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest">
                    {commissions.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-surface-container-low transition-colors ${i > 0 ? 'mt-1' : ''}`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs">
                              {row.clientInitials}
                            </div>
                            <span className="font-bold text-sm">{row.clientName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm">{row.productTypeHe}</td>
                        <td className="px-8 py-5 text-sm text-on-surface-variant">{row.date}</td>
                        <td className="px-8 py-5 text-sm">{row.insuranceCompany}</td>
                        <td className="px-8 py-5 text-start">
                          <span className="font-black text-secondary">{fmt(row.amount)} &#8362;</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-surface-container-low text-center">
                <button className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">
                  צפה בכל העסקאות
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  iconColor,
  bgColor,
  label,
  value,
}: {
  icon: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-lg flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center ${iconColor}`}>
          <Icon name={icon} />
        </div>
        <span className="font-bold text-sm">{label}</span>
      </div>
      <span className="text-xl font-black font-headline">{value}</span>
    </div>
  );
}

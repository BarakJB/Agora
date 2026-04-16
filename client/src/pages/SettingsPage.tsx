import Icon from '../components/ui/Icon';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import CommissionRatesEditor from '../components/CommissionRatesEditor';

const links = [
  { icon: 'download', title: 'לוח עמלות סוכנים - הראל ביטוח (PDF)', desc: 'עודכן לאחרונה: 01/01/2026' },
  { icon: 'open_in_new', title: 'פורטל רשות שוק ההון (PE)', desc: 'כניסה למערכת הדיווח הממשלתית' },
  { icon: 'gavel', title: 'חוזרי רגולציה', desc: 'ארכיון חוזרים והנחיות מקצועיות' },
  { icon: 'account_balance', title: 'טופס 847 - רשות המסים', desc: 'הצהרת מעסיק על הפקדות לקצבה' },
  { icon: 'monitoring', title: 'ביטוח לאומי - מדרגות ופרמטרים', desc: 'טבלאות שכר ומדרגות גבייה מעודכנות' },
  { icon: 'language', title: 'אתר מס הכנסה', desc: 'סימולטורים וטפסי מס מקוונים' },
  { icon: 'database', title: 'פורטל CRM פנימי', desc: 'ניהול תיקי לקוחות ולידים' },
  { icon: 'support_agent', title: 'מחלקת ניהול סוכנים', desc: 'פנייה ישירה למוקד תמיכה טכנית ומקצועית' },
];

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const dashboard = useDataStore((s) => s.dashboard);
  const displayName = profile?.name || 'משתמש חדש';
  const displayRole = profile?.role || 'סוכן';
  const displayLicense = profile?.licenseNumber || '---';
  const displayEmail = profile?.email || '---';
  const displayPhone = profile?.phone || '---';
  const initials = displayName.slice(0, 2);

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-sm text-on-surface-variant font-medium tracking-wide uppercase mb-1">
            ניהול והגדרות
          </p>
          <h1 className="text-4xl font-black text-primary tracking-tight font-headline">
            הגדרות ומשאבים
          </h1>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* Profile & Security */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Profile Card */}
            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary-container" />
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-headline text-4xl font-black">
                    {initials}
                  </div>
                  <button className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <Icon name="edit" size="sm" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-1">{displayName}</h3>
                <p className="text-on-surface-variant mb-6">{displayRole}</p>
                <div className="w-full space-y-4 text-right">
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">מספר רישיון</span>
                    <span className="font-mono text-lg font-bold text-primary">{displayLicense}</span>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">דוא&quot;ל עסקי</span>
                    <span className="font-medium">{displayEmail}</span>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">טלפון</span>
                    <span className="font-medium">{displayPhone}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial">
              <div className="flex items-center gap-3 mb-6">
                <Icon name="shield" className="text-primary" />
                <h3 className="text-lg font-bold">אבטחה וגישה</h3>
              </div>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface-container-low transition-colors text-right">
                  <div className="flex items-center gap-3">
                    <Icon name="lock" className="text-on-surface-variant" />
                    <span className="text-sm font-medium">שינוי סיסמה</span>
                  </div>
                  <Icon name="chevron_left" size="sm" className="text-outline" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface-container-low transition-colors text-right">
                  <div className="flex items-center gap-3">
                    <Icon name="phonelink_setup" className="text-on-surface-variant" />
                    <span className="text-sm font-medium">אימות דו-שלבי (2FA)</span>
                  </div>
                  <div className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                    פעיל
                  </div>
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface-container-low transition-colors text-right">
                  <div className="flex items-center gap-3">
                    <Icon name="history" className="text-on-surface-variant" />
                    <span className="text-sm font-medium">היסטוריית התחברויות</span>
                  </div>
                  <Icon name="chevron_left" size="sm" className="text-outline" />
                </button>
              </div>
            </section>
          </div>

          {/* Links & Resources */}
          <div className="col-span-12 lg:col-span-8">
            <section className="bg-surface-container-low p-8 rounded-lg h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-1 font-headline">
                    קישורים וכלים מקצועיים
                  </h3>
                  <p className="text-on-surface-variant">
                    גישה מהירה למשאבי רגולציה, עמלות ופורטלים ממשלתיים
                  </p>
                </div>
                <Icon name="grid_view" size="lg" className="text-primary/10" />
              </div>

              {/* Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {links.map((link) => (
                  <a
                    key={link.title}
                    href="#"
                    className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-all flex items-start gap-4 border-r-4 border-transparent hover:border-primary"
                  >
                    <div className="bg-primary/5 p-3 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon name={link.icon} />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface mb-1">{link.title}</h4>
                      <p className="text-xs text-on-surface-variant">{link.desc}</p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Growth Banner */}
              <div className="mt-8 editorial-gradient rounded-lg p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="trending_up" className="text-secondary-fixed" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                      תמונת מצב שנתית
                    </span>
                  </div>
                  <h4 className="text-3xl font-black mb-4 font-headline">
                    +{dashboard.growthPct}% צמיחה בתיק המנוהל
                  </h4>
                  <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 flex-1">
                      <p className="text-[10px] opacity-70 mb-1">פוליסות חדשות (רבעון)</p>
                      <p className="text-xl font-bold">{dashboard.newPolicies}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 flex-1">
                      <p className="text-[10px] opacity-70 mb-1">יחס המרה</p>
                      <p className="text-xl font-bold">{dashboard.conversionRate}%</p>
                    </div>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                  <Icon name="account_balance_wallet" className="text-[200px]" />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Commission Rates Editor */}
        <div className="grid grid-cols-12 gap-8 mt-8">
          <CommissionRatesEditor />
        </div>
      </div>
    </div>
  );
}

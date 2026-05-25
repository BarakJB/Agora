import { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import CompanyLogo from '../components/common/CompanyLogo';
import { useAuthStore } from '../store/authStore';
import { usePortfolioFilterStore } from '../store/portfolioFilterStore';
import CommissionRatesEditor from '../components/CommissionRatesEditor';
import * as api from '../services/api';
import { settingsApi, salesApi } from '../services/api';
import type { AnnualSnapshot } from '../services/api';

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

const COMPANIES: { id: string; name: string }[] = [
  { id: 'harel', name: 'הראל' },
  { id: 'phoenix', name: 'הפניקס' },
  { id: 'menora', name: 'מנורה מבטחים' },
  { id: 'analyst', name: 'אנליסט' },
];

type PortfolioType = 'personal' | 'partners';

interface AgentNumberField {
  value: string;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

type AgentNumbersMap = Record<string, Record<PortfolioType, AgentNumberField>>;

function makeEmptyField(): AgentNumberField {
  return { value: '', saving: false, deleting: false, error: null };
}

function buildInitialMap(): AgentNumbersMap {
  const map: AgentNumbersMap = {};
  for (const c of COMPANIES) {
    map[c.id] = { personal: makeEmptyField(), partners: makeEmptyField() };
  }
  return map;
}

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseNumberPartners: string;
  idNumber: string;
}

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const portfolioFilter = usePortfolioFilterStore((s) => s.portfolioFilter);

  const [annualSnapshot, setAnnualSnapshot] = useState<AnnualSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const displayName = profile?.name || 'משתמש חדש';
  const displayRole = profile?.role || 'סוכן';
  const displayLicense = profile?.licenseNumber || null;
  const displayLicensePartners = profile?.licenseNumberPartners || null;
  const displayEmail = profile?.email || null;
  const displayPhone = profile?.phone || null;
  const displayIdNumber = profile?.idNumber || null;
  const initials = displayName.slice(0, 2);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    licenseNumber: profile?.licenseNumber || '',
    licenseNumberPartners: profile?.licenseNumberPartners || '',
    idNumber: profile?.idNumber || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [agentNumbers, setAgentNumbers] = useState<AgentNumbersMap>(buildInitialMap);
  const [agentNumbersLoading, setAgentNumbersLoading] = useState(false);

  function openEditModal() {
    setProfileForm({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      licenseNumber: profile?.licenseNumber || '',
      licenseNumberPartners: profile?.licenseNumberPartners || '',
      idNumber: profile?.idNumber || '',
    });
    setProfileError(null);
    setEditModalOpen(true);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }

  function closeEditModal() {
    if (profileSaving) return;
    setEditModalOpen(false);
    setProfileError(null);
  }

  function handleFormChange(field: keyof ProfileFormState, value: string) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveProfile() {
    if (!profile) return;
    if (!profileForm.name.trim()) {
      setProfileError('שם הוא שדה חובה');
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    try {
      const payload: api.UpdateAgentPayload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        licenseNumber: profileForm.licenseNumber.trim() || undefined,
        licenseNumberPartners: profileForm.licenseNumberPartners.trim() || null,
        idNumber: profileForm.idNumber.trim() || null,
      };
      const res = await api.updateAgent(profile.id, payload);
      if (res.data) {
        updateProfile({
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone,
          licenseNumber: res.data.licenseNumber,
          licenseNumberPartners: res.data.licenseNumberPartners ?? null,
        });
      }
      setEditModalOpen(false);
    } catch (err) {
      const msg = err instanceof api.ApiError ? (err.serverError ?? 'שגיאה בשמירה') : 'שגיאה בשמירה';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  }

  const [partnersSplitPct, setPartnersSplitPct] = useState<number>(50);
  const [partnersSplitSaving, setPartnersSplitSaving] = useState(false);
  const [partnersSplitSaved, setPartnersSplitSaved] = useState(false);
  const [partnersSplitError, setPartnersSplitError] = useState<string | null>(null);
  const [hasPartnersPortfolio, setHasPartnersPortfolio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPartnersSplit() {
      try {
        const [splitRes, typesRes] = await Promise.all([
          settingsApi.getPartnersSplit(),
          api.salesApi.getPortfolioTypes(),
        ]);
        if (!cancelled) {
          if (splitRes.data) setPartnersSplitPct(splitRes.data.pct);
          const types = typesRes.data?.types ?? [];
          setHasPartnersPortfolio(types.includes('partners'));
        }
      } catch {
        // non-critical
      }
    }
    loadPartnersSplit();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSnapshot() {
      setSnapshotLoading(true);
      try {
        const res = await salesApi.getAnnualSnapshot({ portfolioType: portfolioFilter });
        if (!cancelled && res.data) {
          setAnnualSnapshot(res.data);
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setSnapshotLoading(false);
      }
    }
    loadSnapshot();
    return () => { cancelled = true; };
  }, [portfolioFilter]);

  async function handleSavePartnersSplit() {
    if (partnersSplitPct < 0 || partnersSplitPct > 100) {
      setPartnersSplitError('ערך חייב להיות בין 0 ל-100');
      return;
    }
    setPartnersSplitSaving(true);
    setPartnersSplitError(null);
    try {
      await settingsApi.setPartnersSplit(partnersSplitPct);
      setPartnersSplitSaved(true);
      setTimeout(() => setPartnersSplitSaved(false), 2500);
    } catch (err) {
      const msg = err instanceof api.ApiError ? (err.serverError ?? 'שגיאה בשמירה') : 'שגיאה בשמירה';
      setPartnersSplitError(msg);
    } finally {
      setPartnersSplitSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setAgentNumbersLoading(true);
      try {
        const res = await api.getAgentNumbers();
        if (!cancelled && res.data) {
          setAgentNumbers((prev) => {
            const next = buildInitialMap();
            for (const entry of res.data!) {
              const id = entry.insuranceCompanyId;
              const pt = entry.portfolioType;
              if (next[id]) {
                next[id][pt] = { ...makeEmptyField(), value: entry.companyAgentNumber };
              }
            }
            // preserve any unsaved user edits
            for (const id of Object.keys(next)) {
              for (const pt of ['personal', 'partners'] as PortfolioType[]) {
                if (prev[id]?.[pt]?.value && !next[id][pt].value) {
                  next[id][pt].value = prev[id][pt].value;
                }
              }
            }
            return next;
          });
        }
      } catch {
        // silent — not critical for page to work
      } finally {
        if (!cancelled) setAgentNumbersLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function setFieldValue(companyId: string, pt: PortfolioType, value: string) {
    setAgentNumbers((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [pt]: { ...prev[companyId][pt], value, error: null },
      },
    }));
  }

  function setFieldState(companyId: string, pt: PortfolioType, patch: Partial<AgentNumberField>) {
    setAgentNumbers((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [pt]: { ...prev[companyId][pt], ...patch },
      },
    }));
  }

  async function handleSave(companyId: string, pt: PortfolioType) {
    const field = agentNumbers[companyId]?.[pt];
    if (!field || !field.value.trim()) return;
    setFieldState(companyId, pt, { saving: true, error: null });
    try {
      await api.upsertAgentNumber({
        insuranceCompanyId: companyId,
        companyAgentNumber: field.value.trim(),
        portfolioType: pt,
      });
    } catch (err) {
      const msg = err instanceof api.ApiError ? (err.serverError ?? 'שגיאה בשמירה') : 'שגיאה בשמירה';
      setFieldState(companyId, pt, { saving: false, error: msg });
      return;
    }
    setFieldState(companyId, pt, { saving: false });
  }

  async function handleDelete(companyId: string, pt: PortfolioType) {
    setFieldState(companyId, pt, { deleting: true, error: null });
    try {
      await api.deleteAgentNumber({ insuranceCompanyId: companyId, portfolioType: pt });
      setFieldState(companyId, pt, { deleting: false, value: '' });
    } catch (err) {
      const msg = err instanceof api.ApiError ? (err.serverError ?? 'שגיאה במחיקה') : 'שגיאה במחיקה';
      setFieldState(companyId, pt, { deleting: false, error: msg });
    }
  }

  function companyHasOnlyOnePortfolio(companyId: string): boolean {
    const fields = agentNumbers[companyId];
    if (!fields) return false;
    const hasPersonal = !!fields.personal.value.trim();
    const hasPartners = !!fields.partners.value.trim();
    return hasPersonal !== hasPartners;
  }

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
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-1">{displayName}</h3>
                <p className="text-on-surface-variant mb-4">{displayRole}</p>
                <button
                  onClick={openEditModal}
                  aria-label="ערוך פרופיל"
                  className="mb-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Icon name="edit" size="sm" />
                  ערוך פרופיל
                </button>
                <div className="w-full space-y-3 text-right">
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">מספר רישיון אישי</span>
                    {displayLicense ? (
                      <span className="font-mono text-lg font-bold text-primary">{displayLicense}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/60 italic">לא הוגדר</span>
                    )}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">מספר רישיון שותפים</span>
                    {displayLicensePartners ? (
                      <span className="font-mono text-lg font-bold text-primary">{displayLicensePartners}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/60 italic">לא הוגדר</span>
                    )}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">דוא&quot;ל עסקי</span>
                    {displayEmail ? (
                      <span className="font-medium">{displayEmail}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/60 italic">לא הוגדר</span>
                    )}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg">
                    <span className="text-xs text-on-surface-variant block mb-1">טלפון</span>
                    {displayPhone ? (
                      <span className="font-medium">{displayPhone}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/60 italic">לא הוגדר</span>
                    )}
                  </div>
                  {displayIdNumber && (
                    <div className="bg-surface-container-low p-4 rounded-lg">
                      <span className="text-xs text-on-surface-variant block mb-1">תעודת זהות</span>
                      <span className="font-medium">{displayIdNumber}</span>
                    </div>
                  )}
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

                  {snapshotLoading ? (
                    <div className="mb-4">
                      <div className="h-8 w-64 bg-white/20 rounded animate-pulse mb-4" />
                      <div className="flex gap-4">
                        <div className="bg-white/10 rounded-lg p-4 flex-1 h-16 animate-pulse" />
                        <div className="bg-white/10 rounded-lg p-4 flex-1 h-16 animate-pulse" />
                        <div className="bg-white/10 rounded-lg p-4 flex-1 h-16 animate-pulse" />
                      </div>
                    </div>
                  ) : annualSnapshot === null || (
                    annualSnapshot.growthPct === 0 &&
                    annualSnapshot.newClientsLast3Months === 0 &&
                    annualSnapshot.totalActiveClients === 0
                  ) ? (
                    <div className="mb-4">
                      <h4 className="text-xl font-bold mb-2 opacity-80">טרם נטענו דוחות</h4>
                      <p className="text-sm opacity-60">העלה דוחות עמלות כדי לצפות בתמונת המצב השנתית</p>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-3xl font-black mb-4 font-headline">
                        {annualSnapshot.growthPct >= 0
                          ? <span>+{annualSnapshot.growthPct}% צמיחה בתיק המנוהל</span>
                          : <span className="text-red-300">{annualSnapshot.growthPct}% צמיחה בתיק המנוהל</span>
                        }
                      </h4>
                      <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 flex-1">
                          <p className="text-[10px] opacity-70 mb-1">לקוחות חדשים (3 חודשים)</p>
                          <p className="text-xl font-bold">{annualSnapshot.newClientsLast3Months}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 flex-1">
                          <p className="text-[10px] opacity-70 mb-1">לקוחות פעילים סה"כ</p>
                          <p className="text-xl font-bold">{annualSnapshot.totalActiveClients}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 flex-1">
                          <p className="text-[10px] opacity-70 mb-1">שיעור שימור</p>
                          <p className="text-xl font-bold">{annualSnapshot.retentionRate}%</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                  <Icon name="account_balance_wallet" className="text-[200px]" />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Agent Numbers by Portfolio Type */}
        <div className="mt-8">
          <section className="bg-surface-container-lowest rounded-lg shadow-editorial p-8">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="badge" className="text-primary" />
              <h3 className="text-xl font-bold font-headline text-primary">מספרי סוכן לפי תיק</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              הגדר מספרי סוכן נפרדים לתיק האישי ולתיק השותפים לכל חברת ביטוח
            </p>

            {agentNumbersLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {COMPANIES.map((company) => {
                  const fields = agentNumbers[company.id];
                  if (!fields) return null;
                  return (
                    <div key={company.id} className="bg-surface-container-low rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CompanyLogo company={company.id} size="sm" />
                        <h4 className="font-bold text-on-surface">{company.name}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['personal', 'partners'] as PortfolioType[]).map((pt) => {
                          const field = fields[pt];
                          const label = pt === 'personal' ? 'תיק אישי' : 'תיק שותפים';
                          const icon = pt === 'personal' ? 'person' : 'group';
                          return (
                            <div key={pt} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Icon name={icon} size="sm" className="text-on-surface-variant" />
                                <span className="text-sm font-semibold text-on-surface">{label}</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => setFieldValue(company.id, pt, e.target.value)}
                                  placeholder={`מספר סוכן — ${label}`}
                                  aria-label={`מספר סוכן ${label} — ${company.name}`}
                                  className="flex-1 bg-surface border border-outline-variant/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                />
                                <button
                                  onClick={() => handleSave(company.id, pt)}
                                  disabled={field.saving || !field.value.trim()}
                                  aria-label={`שמור ${label} — ${company.name}`}
                                  className="px-3 py-2 bg-secondary text-on-secondary rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >
                                  {field.saving ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-on-secondary/30 border-t-on-secondary animate-spin" />
                                  ) : (
                                    <Icon name="save" size="sm" />
                                  )}
                                </button>
                                {field.value && (
                                  <button
                                    onClick={() => handleDelete(company.id, pt)}
                                    disabled={field.deleting}
                                    aria-label={`מחק ${label} — ${company.name}`}
                                    className="px-3 py-2 bg-error-container text-on-error-container rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                  >
                                    {field.deleting ? (
                                      <div className="w-4 h-4 rounded-full border-2 border-on-error-container/30 border-t-on-error-container animate-spin" />
                                    ) : (
                                      <Icon name="delete_outline" size="sm" />
                                    )}
                                  </button>
                                )}
                              </div>
                              {field.error && (
                                <p className="text-xs text-error">{field.error}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {companyHasOnlyOnePortfolio(company.id) && (
                        <p className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
                          <Icon name="info" size="sm" className="text-secondary opacity-70" />
                          להפעלת הפרדה בין תיק אישי לשותפים, הוסף גם את המספר השני
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Partners Split — shown only if agent has a partners portfolio */}
        {hasPartnersPortfolio && (
          <div className="mt-8">
            <section className="bg-surface-container-lowest rounded-lg shadow-editorial p-8">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="group" className="text-primary" />
                <h3 className="text-xl font-bold font-headline text-primary">חלוקת תיק שותפים</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">
                סכומים מתיק שותפים יוכפלו באחוז זה כשמציגים &quot;שלי בפועל&quot;
              </p>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="partners-split-input"
                    className="text-sm font-semibold text-on-surface"
                  >
                    האחוז שלי בתיק שותפים
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="partners-split-input"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={partnersSplitPct}
                      onChange={(e) => {
                        setPartnersSplitPct(Number(e.target.value));
                        setPartnersSplitError(null);
                        setPartnersSplitSaved(false);
                      }}
                      aria-label="אחוז חלוקת תיק שותפים"
                      className="w-24 bg-surface border border-outline-variant/40 rounded-lg px-3 py-2 text-sm font-mono text-end focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <span className="text-sm font-bold text-on-surface-variant">%</span>
                  </div>
                  {partnersSplitError && (
                    <p className="text-xs text-error">{partnersSplitError}</p>
                  )}
                </div>
                <button
                  onClick={handleSavePartnersSplit}
                  disabled={partnersSplitSaving}
                  aria-label="שמור חלוקת תיק שותפים"
                  className="px-6 py-2.5 bg-secondary text-on-secondary rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                >
                  {partnersSplitSaving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-on-secondary/30 border-t-on-secondary animate-spin" />
                  ) : (
                    <Icon name="save" size="sm" />
                  )}
                  שמור
                </button>
                {partnersSplitSaved && (
                  <div className="flex items-center gap-1.5 text-secondary text-sm font-semibold">
                    <Icon name="check_circle" size="sm" />
                    נשמר
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Commission Rates Editor */}
        <div className="grid grid-cols-12 gap-8 mt-8">
          <CommissionRatesEditor />
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="עריכת פרופיל"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEditModal}
            aria-hidden="true"
          />
          <div className="relative bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-lg p-8 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface font-headline">עריכת פרופיל</h2>
              <button
                onClick={closeEditModal}
                disabled={profileSaving}
                aria-label="סגור חלון עריכת פרופיל"
                className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-40"
              >
                <Icon name="close" size="sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-sm font-semibold text-on-surface mb-1.5">
                  שם מלא <span className="text-error">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  id="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  aria-label="שם מלא"
                  aria-required="true"
                  className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-sm font-semibold text-on-surface mb-1.5">
                  דוא&quot;ל עסקי
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  aria-label="דואל עסקי"
                  className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm font-semibold text-on-surface mb-1.5">
                  טלפון
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  aria-label="מספר טלפון"
                  className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-license" className="block text-sm font-semibold text-on-surface mb-1.5">
                    רישיון אישי
                  </label>
                  <input
                    id="profile-license"
                    type="text"
                    value={profileForm.licenseNumber}
                    onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                    aria-label="מספר רישיון אישי"
                    className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="profile-license-partners" className="block text-sm font-semibold text-on-surface mb-1.5">
                    רישיון שותפים
                  </label>
                  <input
                    id="profile-license-partners"
                    type="text"
                    value={profileForm.licenseNumberPartners}
                    onChange={(e) => handleFormChange('licenseNumberPartners', e.target.value)}
                    aria-label="מספר רישיון שותפים"
                    className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-idnumber" className="block text-sm font-semibold text-on-surface mb-1.5">
                  תעודת זהות
                </label>
                <input
                  id="profile-idnumber"
                  type="text"
                  value={profileForm.idNumber}
                  onChange={(e) => handleFormChange('idNumber', e.target.value)}
                  aria-label="מספר תעודת זהות"
                  inputMode="numeric"
                  className="w-full bg-surface border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            {profileError && (
              <p role="alert" className="mt-4 text-sm text-error flex items-center gap-1.5">
                <Icon name="error_outline" size="sm" />
                {profileError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeEditModal}
                disabled={profileSaving}
                aria-label="בטל עריכה"
                className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-40"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                aria-label="שמור שינויים בפרופיל"
                className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                {profileSaving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Icon name="save" size="sm" />
                )}
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';

type Tab = 'demo' | 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginDemo = useAuthStore((s) => s.loginDemo);
  const loginWithApi = useAuthStore((s) => s.loginWithApi);
  const registerWithApi = useAuthStore((s) => s.registerWithApi);
  const authLoading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const loadData = useDataStore((s) => s.loadData);

  const [tab, setTab] = useState<Tab>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleDemo() {
    loginDemo();
    loadData('demo');
    navigate('/dashboard');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await loginWithApi(email, password);
      navigate('/dashboard');
    } catch {
      // Error is set in authStore
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      await registerWithApi({ name, email, password, phone, licenseNumber: license });
      navigate('/dashboard');
    } catch {
      // Error is set in authStore
    }
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    clearError();
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-tertiary-container z-50" />

      {/* Hero Side */}
      <section className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90 z-10" />
        <div className="relative z-20 flex flex-col justify-between p-16 w-full text-on-primary">
          <div>
            <h1 className="text-4xl font-headline font-black tracking-tighter uppercase mb-2">PayAgent</h1>
            <div className="h-1 w-12 bg-secondary rounded-full" />
          </div>
          <div className="max-w-md">
            <p className="font-headline text-5xl font-extrabold leading-tight mb-6">
              ניהול עמלות בעידן המודרני.
            </p>
            <p className="text-xl text-on-primary/80 leading-relaxed font-body">
              המערכת המתקדמת ביותר לחישוב שכר, עמלות ופריון לסוכני ביטוח ופנסיה. דיוק מוסדי, חוויה אישית.
            </p>
          </div>
          <div className="flex items-center gap-8 text-sm font-label uppercase tracking-widest opacity-60">
            <span>&copy; 2026 PAYAGENT</span>
            <span>מערכת מאובטחת</span>
          </div>
        </div>
      </section>

      {/* Form Side */}
      <section className="w-full lg:w-2/5 bg-surface flex flex-col items-center justify-center p-8 md:p-16 relative">
        <div className="absolute top-12 right-12 lg:hidden">
          <h2 className="text-2xl font-headline font-black text-primary tracking-tighter">PAYAGENT</h2>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Tab Switcher */}
          <div className="flex bg-surface-container-high rounded-lg p-1">
            {([
              ['demo', 'חשבון דמו'],
              ['login', 'התחברות'],
              ['register', 'משתמש חדש'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${
                  tab === key
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Demo Tab ── */}
          {tab === 'demo' && (
            <div className="space-y-8">
              <header className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">חשבון דמו</h2>
                <p className="text-on-surface-variant font-body">
                  היכנס עם נתונים לדוגמה — 10 פוליסות, 10 עמלות, 5 חברות ביטוח. מושלם לסיור מהיר במערכת.
                </p>
              </header>

              <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-headline text-xl font-black">
                    דא
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">דניאל אהרוני</p>
                    <p className="text-sm text-on-surface-variant">סוכן פנסיוני בכיר</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                    <p className="text-lg font-black font-headline text-primary">10</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">פוליסות</p>
                  </div>
                  <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                    <p className="text-lg font-black font-headline text-secondary">10</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">עמלות</p>
                  </div>
                  <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                    <p className="text-lg font-black font-headline text-primary">5</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">חברות</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDemo}
                className="w-full editorial-gradient text-on-primary font-headline font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
              >
                <Icon name="play_arrow" />
                <span>כניסה לחשבון דמו</span>
              </button>
            </div>
          )}

          {/* ── Login Tab ── */}
          {tab === 'login' && (
            <div className="space-y-6">
              <header className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">כניסה למערכת</h2>
                <p className="text-on-surface-variant font-body">הזן את פרטי ההתחברות שלך.</p>
              </header>

              <form className="space-y-5" onSubmit={handleLogin}>
                {authError && (
                  <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-medium">
                    {authError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="login-email">
                    אימייל
                  </label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    id="login-email"
                    placeholder="your@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    required
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="login-pass">
                      סיסמה
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface"
                      id="login-pass"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={authLoading}
                    />
                    <button className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary" type="button" onClick={() => setShowPassword(!showPassword)}>
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                    </button>
                  </div>
                </div>
                <button
                  className="w-full bg-primary-container text-on-primary font-headline font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <span>התחברות מאובטחת</span>
                      <Icon name="arrow_back" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ─��� Register Tab ── */}
          {tab === 'register' && (
            <div className="space-y-6">
              <header className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">משתמש חדש</h2>
                <p className="text-on-surface-variant font-body">
                  צור חשבון חדש — המערכת תאחזר נתונים מהשרת.
                </p>
              </header>

              <form className="space-y-4" onSubmit={handleRegister}>
                {authError && (
                  <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-medium">
                    {authError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">שם מלא</label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    placeholder="ישראל ישראלי"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">אימייל</label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    placeholder="your@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">סיסמה</label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    placeholder="לפחות 6 תווים"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">טלפון</label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    placeholder="054-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">מספר רישיון סוכן</label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    placeholder="052-XXXXXX-X"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
                <button
                  className="w-full bg-secondary text-on-secondary font-headline font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Icon name="person_add" />
                      <span>צור חשבון חדש</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Security Footer */}
          <div className="pt-6 border-t border-outline-variant/10">
            <div className="flex items-center justify-between text-xs font-label text-on-surface-variant/70 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Icon name="verified_user" filled className="text-secondary" size="sm" />
                <span>חיבור SSL מאובטח</span>
              </div>
              <div className="flex items-center gap-2">
                <span>AES-256</span>
                <Icon name="lock" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { authApi } from '../services/api';
import { ApiError } from '../services/api';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(timer);
  }, [step, navigate]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startResendCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('חרגת ממגבלת הבקשות. אנא המתן שעה ונסה שוב.');
      } else {
        setStep('otp');
        startResendCooldown();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      startResendCooldown();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('חרגת ממגבלת הבקשות. אנא המתן שעה.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('הקוד שגוי או שפג תוקפו. בדוק שהזנת נכון או בקש קוד חדש.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('חרגת ממגבלת הניסיונות. אנא המתן שעה.');
      } else {
        setError('אירעה שגיאה. אנא נסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-tertiary-container z-50" />

      <section className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90 z-10" />
        <div className="relative z-20 flex flex-col justify-between p-16 w-full text-on-primary">
          <div>
            <h1 className="text-4xl font-headline font-black tracking-tighter uppercase mb-2">Agora</h1>
            <div className="h-1 w-12 bg-secondary rounded-full" />
          </div>
          <div className="max-w-md">
            <p className="font-headline text-5xl font-extrabold leading-tight mb-6">
              {step === 'otp' ? 'הזן את קוד האימות.' : 'שחזור גישה למערכת.'}
            </p>
            <p className="text-xl text-on-primary/80 leading-relaxed font-body">
              {step === 'otp'
                ? 'שלחנו קוד בן 6 ספרות לכתובת האימייל שלך.'
                : 'שלח לנו את כתובת האימייל שלך ונשלח קוד אימות לאיפוס הסיסמה.'}
            </p>
          </div>
          <div className="flex items-center gap-8 text-sm font-label uppercase tracking-widest opacity-60">
            <span>&copy; 2026 PAYAGENT</span>
            <span>מערכת מאובטחת</span>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-2/5 bg-surface flex flex-col items-center justify-center p-8 md:p-16 relative">
        <div className="absolute top-12 right-12 lg:hidden">
          <h2 className="text-2xl font-headline font-black text-primary tracking-tighter">PAYAGENT</h2>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {step === 'email' && (
            <div className="space-y-6">
              <header className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">שחזור סיסמה</h2>
                <p className="text-on-surface-variant font-body">
                  הזן את כתובת האימייל שלך ונשלח קוד אימות בן 6 ספרות.
                </p>
              </header>

              <form className="space-y-5" onSubmit={handleSendOTP}>
                {error && (
                  <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label
                    className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant"
                    htmlFor="forgot-email"
                  >
                    אימייל
                  </label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    id="forgot-email"
                    placeholder="your@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <button
                  className="w-full bg-primary-container text-on-primary font-headline font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <span>שלח קוד אימות</span>
                      <Icon name="send" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-on-surface-variant hover:text-primary font-label transition-colors"
                >
                  חזור להתחברות
                </Link>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6">
              <header className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">הזן קוד אימות</h2>
                <p className="text-on-surface-variant font-body">
                  שלחנו קוד בן 6 ספרות ל-<span className="font-semibold text-on-surface">{email}</span>
                </p>
              </header>

              <form className="space-y-5" onSubmit={handleResetPassword}>
                {error && (
                  <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant"
                    htmlFor="otp-input"
                  >
                    קוד אימות (6 ספרות)
                  </label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline text-center text-2xl font-mono tracking-widest"
                    id="otp-input"
                    placeholder="000000"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant"
                    htmlFor="new-password"
                  >
                    סיסמה חדשה
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                      id="new-password"
                      placeholder="לפחות 8 תווים"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                      required
                      minLength={8}
                      disabled={loading}
                    />
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant"
                    htmlFor="confirm-password"
                  >
                    אימות סיסמה
                  </label>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
                    id="confirm-password"
                    placeholder="הזן שוב את הסיסמה"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  className="w-full bg-primary-container text-on-primary font-headline font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <span>אפס סיסמה</span>
                      <Icon name="lock_reset" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-sm font-label">
                <button
                  className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `שלח שוב בעוד ${resendCooldown}ש` : 'לא קיבלת? שלח שוב'}
                </button>
                <button
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  type="button"
                  onClick={() => { setStep('email'); setError(null); setOtp(''); }}
                >
                  שנה אימייל
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mx-auto">
                <Icon name="check_circle" className="text-secondary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-headline font-bold text-on-surface">הסיסמה אופסה</h2>
                <p className="text-on-surface-variant font-body leading-relaxed">
                  הסיסמה שלך עודכנה בהצלחה.
                </p>
                <p className="text-sm text-on-surface-variant/70 font-body">
                  מועבר להתחברות בעוד 3 שניות...
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full bg-primary-container text-on-primary font-headline font-bold py-4 rounded-lg text-center hover:opacity-95 active:scale-[0.98] transition-all"
              >
                התחבר עכשיו
              </Link>
            </div>
          )}

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

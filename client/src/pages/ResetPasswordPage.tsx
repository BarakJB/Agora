import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/forgot-password', { replace: true }), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

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
              שחזור גישה למערכת.
            </p>
          </div>
          <div className="flex items-center gap-8 text-sm font-label uppercase tracking-widest opacity-60">
            <span>&copy; 2026 PAYAGENT</span>
            <span>מערכת מאובטחת</span>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-2/5 bg-surface flex flex-col items-center justify-center p-8 md:p-16 relative">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mx-auto">
            <Icon name="info" className="text-secondary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-headline font-bold text-on-surface">הקישור אינו בשימוש</h2>
            <p className="text-on-surface-variant font-body leading-relaxed">
              איפוס הסיסמה מתבצע כעת באמצעות קוד אימות בן 6 ספרות שנשלח לאימייל שלך.
            </p>
            <p className="text-sm text-on-surface-variant/70 font-body">
              מועבר לדף האיפוס בעוד 4 שניות...
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="block w-full bg-primary-container text-on-primary font-headline font-bold py-4 rounded-lg text-center hover:opacity-95 active:scale-[0.98] transition-all"
          >
            עבור לאיפוס סיסמה
          </Link>
        </div>
      </section>
    </div>
  );
}

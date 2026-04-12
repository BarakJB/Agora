import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../store/authStore';
import NewPolicyModal from '../ui/NewPolicyModal';

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'דשבורד' },
  { to: '/policies', icon: 'description', label: 'מעקב פוליסות' },
  { to: '/portfolio', icon: 'analytics', label: 'ניתוח תיק' },
  { to: '/upload', icon: 'upload_file', label: 'העלאת עמלות' },
  { to: '/monthly', icon: 'calendar_month', label: 'דוחות חודשיים' },
  { to: '/settings', icon: 'settings', label: 'הגדרות' },
];

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [showNewPolicy, setShowNewPolicy] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-inverse-surface/30 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={clsx(
          'fixed top-0 right-0 h-screen w-72 flex flex-col bg-surface-container-low z-40 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="account_balance" className="text-white" size="sm" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary font-headline" dir="ltr">Agora</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">ניהול עמלות חכם</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewPolicy(true)}
            className="w-full bg-primary-container text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 mb-8 hover:opacity-90 transition-opacity"
          >
            <Icon name="add" size="sm" />
            <span>פוליסה חדשה</span>
          </button>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-4 px-4 py-3 transition-colors rounded-lg',
                    isActive
                      ? 'text-primary font-semibold bg-surface-container-high'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} filled={isActive} />
                    <span className="font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-6">
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors">
              <Icon name="help" />
              <span className="text-sm">תמיכה</span>
            </a>
            <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-error transition-colors w-full">
              <Icon name="logout" />
              <span className="text-sm">יציאה</span>
            </button>
          </nav>
        </div>
      </aside>

      <NewPolicyModal open={showNewPolicy} onClose={() => setShowNewPolicy(false)} />
    </>
  );
}

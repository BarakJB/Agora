import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';

interface TopBarProps {
  title?: string;
  onMenuToggle: () => void;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

interface Notification {
  id: string;
  icon: string;
  text: string;
  time: string;
  read: boolean;
}

function buildNotifications(
  commissions: { clientName: string; amount: number; date: string; productTypeHe: string }[],
  policies: { clientName: string; status: string; productTypeHe: string }[],
): Notification[] {
  const items: Notification[] = [];

  commissions.slice(0, 3).forEach((c, i) => {
    items.push({
      id: `comm-${i}`,
      icon: 'payments',
      text: `עמלה ₪${c.amount.toLocaleString()} — ${c.clientName} (${c.productTypeHe})`,
      time: c.date,
      read: i > 0,
    });
  });

  policies
    .filter((p) => p.status === 'pending')
    .slice(0, 2)
    .forEach((p, i) => {
      items.push({
        id: `pol-${i}`,
        icon: 'pending_actions',
        text: `פוליסה ממתינה — ${p.clientName} (${p.productTypeHe})`,
        time: 'ממתין לאישור',
        read: false,
      });
    });

  return items;
}

export default function TopBar({ title, onMenuToggle }: TopBarProps) {
  const profile = useAuthStore((s) => s.profile);
  const userMode = useAuthStore((s) => s.userMode);
  const commissions = useDataStore((s) => s.commissions);
  const policies = useDataStore((s) => s.policies);

  const displayName = profile?.name || 'אורח';
  const displayRole = profile?.role || 'סוכן';
  const initials = displayName.slice(0, 2);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setShowNotifications(false));
  useClickOutside(calRef, () => setShowCalendar(false));

  const notifications = buildNotifications(commissions, policies);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const today = new Date();
  const hebrewDate = today.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="flex justify-between items-center w-full px-4 lg:px-8 h-16 sticky top-0 z-30 glass-header shadow-editorial-sm">
      <div className="flex items-center gap-4 flex-1">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label="תפריט"
        >
          <Icon name="menu" />
        </button>

        <div className="relative w-full max-w-96 hidden sm:block">
          <Icon
            name="search"
            className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size="sm"
          />
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pe-10 text-sm focus:ring-2 focus:ring-primary/20"
            placeholder="חפש פוליסות, לקוחות או נתונים..."
            type="text"
            aria-label="חיפוש"
          />
        </div>
        {title && (
          <>
            <div className="h-6 w-px bg-surface-container-high hidden md:block" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-headline hidden md:block">
              {title}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="p-2 text-on-surface-variant hover:opacity-80 transition-opacity relative"
            onClick={() => {
              setShowNotifications((v) => !v);
              setShowCalendar(false);
            }}
            aria-label="התראות"
          >
            <Icon name="notifications" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-error rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute start-0 top-full mt-2 w-80 bg-surface rounded-xl shadow-editorial border border-outline-variant z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface">התראות</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-error text-on-error px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} חדשות
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
                  <Icon name="notifications_off" className="text-on-surface-variant/40 mb-2" size="lg" />
                  <p>אין התראות חדשות</p>
                </div>
              ) : (
                <ul className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant last:border-b-0 ${
                        n.read ? 'opacity-60' : 'bg-primary-fixed/5'
                      }`}
                    >
                      <Icon name={n.icon} size="sm" className="text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-on-surface leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="relative hidden sm:block" ref={calRef}>
          <button
            className="p-2 text-on-surface-variant hover:opacity-80 transition-opacity"
            onClick={() => {
              setShowCalendar((v) => !v);
              setShowNotifications(false);
            }}
            aria-label="לוח שנה"
          >
            <Icon name="calendar_today" />
          </button>

          {showCalendar && (
            <div className="absolute start-0 top-full mt-2 w-72 bg-surface rounded-xl shadow-editorial border border-outline-variant z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant">
                <span className="text-sm font-bold text-on-surface">לוח שנה</span>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-3xl font-bold text-primary mb-1">{today.getDate()}</p>
                <p className="text-sm text-on-surface">{hebrewDate}</p>
              </div>
              {policies.filter((p) => p.status === 'active').length > 0 && (
                <div className="px-4 pb-3 border-t border-outline-variant pt-3">
                  <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                    פוליסות פעילות
                  </p>
                  <p className="text-xs text-on-surface">
                    {policies.filter((p) => p.status === 'active').length} פוליסות פעילות במערכת
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ms-4">
          {userMode === 'demo' && (
            <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
              demo
            </span>
          )}
          <div className="text-start hidden sm:block">
            <p className="text-xs font-bold text-on-surface">{displayName}</p>
            <p className="text-[10px] text-on-surface-variant">{displayRole}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

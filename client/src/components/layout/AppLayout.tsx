import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuthStore } from '../../store/authStore';
import { usePortfolioFilterStore } from '../../store/portfolioFilterStore';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkMultiplePortfolios = usePortfolioFilterStore((s) => s.checkMultiplePortfolios);

  useEffect(() => {
    if (isAuthenticated) {
      checkMultiplePortfolios();
    }
  }, [isAuthenticated, checkMultiplePortfolios]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="lg:mr-72 min-h-screen">
        <TopBar title="לוח פיננסי" onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
        <Outlet />
      </main>
    </div>
  );
}

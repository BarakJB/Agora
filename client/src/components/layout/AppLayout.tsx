import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="lg:me-72 min-h-screen">
        <TopBar title="לוח פיננסי" onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
        <Outlet />
      </main>
    </div>
  );
}

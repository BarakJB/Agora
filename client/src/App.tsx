import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PolicyTrackerPage = lazy(() => import('./pages/PolicyTrackerPage'));
const CommissionUploadPage = lazy(() => import('./pages/CommissionUploadPage'));
const MonthlySalesPage = lazy(() => import('./pages/MonthlySalesPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdvisorPage = lazy(() => import('./pages/AdvisorPage'));
const ClientRankingPage = lazy(() => import('./pages/ClientRankingPage'));
const AnomaliesPage = lazy(() => import('./pages/AnomaliesPage'));
const ContractCoveragePage = lazy(() => import('./pages/ContractCoveragePage'));
const SalesPotentialPage = lazy(() => import('./pages/SalesPotentialPage'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

/**
 * Clears stale data when user changes.
 * This ensures a new user never sees another user's data from localStorage.
 */
/**
 * Only resets data store when the user ACTUALLY CHANGES (different ID).
 * On normal page refresh with same user, data is preserved and reloaded from DB.
 */
function UserDataGuard({ children }: { children: React.ReactNode }) {
  const profileId = useAuthStore((s) => s.profile?.id);
  const userMode = useAuthStore((s) => s.userMode);
  const loadData = useDataStore((s) => s.loadData);
  const lastUserId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!profileId) {
      lastUserId.current = null;
      initialized.current = false;
      return;
    }

    // First mount with persisted user — don't clear, let dashboard load from DB
    if (!initialized.current) {
      initialized.current = true;
      lastUserId.current = profileId;
      // Only load demo data on first mount for demo users
      if (userMode === 'demo') {
        loadData('demo');
      }
      return;
    }

    // User actually changed — clear old data
    if (profileId !== lastUserId.current) {
      lastUserId.current = profileId;
      if (userMode === 'demo') {
        loadData('demo');
      } else {
        loadData('new');
      }
    }
  }, [profileId, userMode, loadData]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsOnboarding = useAuthStore((s) =>
    s.isAuthenticated &&
    s.userMode === 'new' &&
    !s.profile?.onboardingCompleted
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingCompleted = useAuthStore((s) => s.profile?.onboardingCompleted);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (onboardingCompleted) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <UserDataGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingGuard>
                <OnboardingPage />
              </OnboardingGuard>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="advisor" element={<AdvisorPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="policies" element={<PolicyTrackerPage />} />
            <Route path="upload" element={<CommissionUploadPage />} />
            <Route path="monthly" element={<MonthlySalesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="clients/ranking" element={<ClientRankingPage />} />
            <Route path="clients/:clientId" element={<ClientRankingPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="portfolio/contract-coverage" element={<ContractCoveragePage />} />
            <Route path="potential" element={<SalesPotentialPage />} />
          </Route>
        </Routes>
      </Suspense>
    </UserDataGuard>
  );
}

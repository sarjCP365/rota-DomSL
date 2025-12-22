/**
 * CarePoint 365 Rota Application
 * Main application component with authentication
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  AuthProvider, 
  AuthenticatedTemplate, 
  UnauthenticatedTemplate 
} from './components/auth/AuthProvider';
import { LoginPage } from './components/auth/LoginPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loading } from './components/common/Loading';
import { Dashboard } from './pages/Dashboard';
import { RotaView } from './pages/RotaView';
import { DailyView } from './pages/DailyView';
import { StaffManagement } from './pages/StaffManagement';
import { Settings } from './pages/Settings';
import { UnitsManagement } from './pages/admin/UnitsManagement';
import { PatternLibraryPage, PatternBuilderPage, PatternAssignmentPage } from './features/shift-patterns';
import { UnpublishedShiftsPage } from './pages/UnpublishedShiftsPage';
import { useAuth } from './hooks/useAuth';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Main App component
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AuthenticatedTemplate>
              <AuthenticatedApp />
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
              <LoginPage />
            </UnauthenticatedTemplate>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * Authenticated application routes
 */
function AuthenticatedApp() {
  const { isLoading, isLoadingStaffMember, staffMember, error } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  // Show loading while fetching staff member
  if (isLoadingStaffMember) {
    return <Loading message="Loading your profile..." />;
  }

  // Show warning if no staff member found
  if (!staffMember && !isLoadingStaffMember) {
    return <NoStaffMemberWarning error={error} />;
  }

  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* Rota Views */}
      <Route path="/rota/:duration" element={<RotaView />} />
      <Route path="/daily" element={<DailyView />} />

      {/* Staff Management */}
      <Route path="/staff-capabilities" element={<StaffManagement />} />
      <Route path="/admin/staff" element={<StaffManagement />} />
      <Route path="/admin/staff/:staffId" element={<StaffManagement />} />

      {/* Units Management */}
      <Route path="/admin/units" element={<UnitsManagement />} />

      {/* Shift Patterns */}
      <Route path="/patterns" element={<PatternLibraryPage />} />
      <Route path="/patterns/new" element={<PatternBuilderPage />} />
      <Route path="/patterns/:id" element={<PatternBuilderPage />} />
      <Route path="/patterns/assign" element={<PatternAssignmentPage />} />

      {/* Shift Management */}
      <Route path="/shifts/unpublished" element={<UnpublishedShiftsPage />} />

      {/* Settings */}
      <Route path="/settings" element={<Settings />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Warning displayed when user is authenticated but no staff member found
 */
function NoStaffMemberWarning({ error }: { error: string | null }) {
  const { logout, azureUser } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-elevation-1 p-4">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <svg
            className="h-6 w-6 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          Staff Profile Not Found
        </h2>

        <p className="mt-2 text-gray-600">
          You have signed in as <strong>{azureUser?.email}</strong>, but we couldn't
          find a matching staff member record in CarePoint 365.
        </p>

        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Please contact your administrator to ensure your email address is
          registered in the system.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-lg border border-border-grey px-4 py-2 hover:bg-elevation-1"
          >
            Try Again
          </button>
          <button
            onClick={() => logout()}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

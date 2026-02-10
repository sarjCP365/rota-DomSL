/**
 * CarePoint 365 Rota Application
 * Main application component with authentication
 *
 * Code splitting: Route-level components are lazy loaded for better performance.
 * Error boundaries are strategically placed:
 * - App level: Catches critical errors in auth/query providers
 * - Route level: Each page wrapped to prevent cascading failures
 * - Feature level: Sidebar wrapped separately from main content
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AuthProvider,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from '@/components/auth/AuthProvider';
import { LoginPage } from '@/components/auth/LoginPage';
import { ErrorBoundary, RouteErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loading } from '@/components/common/Loading';
import { useAuth } from '@/hooks/useAuth';
import { EnvironmentIndicator } from '@/components/common/EnvironmentIndicator';

// ============================================================================
// Lazy-loaded route components (code splitting for better performance)
// ============================================================================

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const RotaView = lazy(() => import('@/pages/RotaView').then((m) => ({ default: m.RotaView })));
const DailyView = lazy(() => import('@/pages/DailyView').then((m) => ({ default: m.DailyView })));
const StaffManagement = lazy(() =>
  import('@/pages/StaffManagement').then((m) => ({ default: m.StaffManagement }))
);
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const UnitsManagement = lazy(() =>
  import('@/pages/admin/UnitsManagement').then((m) => ({ default: m.UnitsManagement }))
);
const UnpublishedShiftsPage = lazy(() =>
  import('@/pages/UnpublishedShiftsPage').then((m) => ({ default: m.UnpublishedShiftsPage }))
);

// Shift patterns feature (lazy loaded as a group)
const PatternLibraryPage = lazy(() =>
  import('@/features/shift-patterns').then((m) => ({ default: m.PatternLibraryPage }))
);
const PatternBuilderPage = lazy(() =>
  import('@/features/shift-patterns').then((m) => ({ default: m.PatternBuilderPage }))
);
const PatternAssignmentPage = lazy(() =>
  import('@/features/shift-patterns').then((m) => ({ default: m.PatternAssignmentPage }))
);

// Domiciliary/Supported Living
const DomiciliaryRota = lazy(() =>
  import('@/pages/DomiciliaryRota').then((m) => ({ default: m.DomiciliaryRota }))
);
const StaffAvailability = lazy(() =>
  import('@/pages/StaffAvailability').then((m) => ({ default: m.StaffAvailability }))
);
const RoundPlanning = lazy(() =>
  import('@/pages/RoundPlanning').then((m) => ({ default: m.RoundPlanning }))
);
const Reports = lazy(() =>
  import('@/pages/Reports').then((m) => ({ default: m.Reports }))
);
const StaffSchedule = lazy(() =>
  import('@/pages/StaffSchedule').then((m) => ({ default: m.StaffSchedule }))
);

// Shift Swap & Requests
const RequestsView = lazy(() => import('@/pages/RequestsView'));
const OpenShiftsDashboard = lazy(() => import('@/pages/OpenShiftsDashboard'));

// Admin Configuration
const SwapConfiguration = lazy(() => import('@/pages/admin/SwapConfiguration'));
const MatchingConfiguration = lazy(() => import('@/pages/admin/MatchingConfiguration'));

// Reports
const SwapHistoryReport = lazy(() => import('@/pages/reports/SwapHistoryReport'));

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
    <>
      <EnvironmentIndicator />
      {/* Suspense wrapper for lazy-loaded route components */}
      <Suspense fallback={<Loading message="Loading page..." />}>
        <Routes>
          {/* Dashboard */}
          <Route
            path="/"
            element={
              <RouteErrorBoundary routeName="Dashboard">
                <Dashboard />
              </RouteErrorBoundary>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Rota Views */}
          <Route
            path="/rota/:duration"
            element={
              <RouteErrorBoundary routeName="Rota View">
                <RotaView />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/daily"
            element={
              <RouteErrorBoundary routeName="Daily View">
                <DailyView />
              </RouteErrorBoundary>
            }
          />

          {/* Staff Management */}
          <Route
            path="/staff-capabilities"
            element={
              <RouteErrorBoundary routeName="Staff Capabilities">
                <StaffManagement />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <RouteErrorBoundary routeName="Staff Management">
                <StaffManagement />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/admin/staff/:staffId"
            element={
              <RouteErrorBoundary routeName="Staff Details">
                <StaffManagement />
              </RouteErrorBoundary>
            }
          />

          {/* Units Management */}
          <Route
            path="/admin/units"
            element={
              <RouteErrorBoundary routeName="Units Management">
                <UnitsManagement />
              </RouteErrorBoundary>
            }
          />

          {/* Shift Patterns */}
          <Route
            path="/patterns"
            element={
              <RouteErrorBoundary routeName="Pattern Library">
                <PatternLibraryPage />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/patterns/new"
            element={
              <RouteErrorBoundary routeName="New Pattern">
                <PatternBuilderPage />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/patterns/:id"
            element={
              <RouteErrorBoundary routeName="Edit Pattern">
                <PatternBuilderPage />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/patterns/assign"
            element={
              <RouteErrorBoundary routeName="Pattern Assignment">
                <PatternAssignmentPage />
              </RouteErrorBoundary>
            }
          />

          {/* Shift Management */}
          <Route
            path="/shifts/unpublished"
            element={
              <RouteErrorBoundary routeName="Unpublished Shifts">
                <UnpublishedShiftsPage />
              </RouteErrorBoundary>
            }
          />

          {/* Domiciliary/Supported Living */}
          <Route
            path="/domiciliary"
            element={
              <RouteErrorBoundary routeName="Domiciliary Rota">
                <DomiciliaryRota />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/staff-availability"
            element={
              <RouteErrorBoundary routeName="Staff Availability">
                <StaffAvailability />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/round-planning"
            element={
              <RouteErrorBoundary routeName="Round Planning">
                <RoundPlanning />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/staff-schedule"
            element={
              <RouteErrorBoundary routeName="Staff Schedule">
                <StaffSchedule />
              </RouteErrorBoundary>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <RouteErrorBoundary routeName="Reports">
                <Reports />
              </RouteErrorBoundary>
            }
          />

          {/* Shift Swaps & Requests */}
          <Route
            path="/requests"
            element={
              <RouteErrorBoundary routeName="Requests">
                <RequestsView />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/open-shifts"
            element={
              <RouteErrorBoundary routeName="Open Shifts">
                <OpenShiftsDashboard />
              </RouteErrorBoundary>
            }
          />

          {/* Admin Configuration */}
          <Route
            path="/admin/swap-configuration"
            element={
              <RouteErrorBoundary routeName="Swap Configuration">
                <SwapConfiguration />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/admin/matching-configuration"
            element={
              <RouteErrorBoundary routeName="Matching Configuration">
                <MatchingConfiguration />
              </RouteErrorBoundary>
            }
          />

          {/* Reports */}
          <Route
            path="/reports/swap-history"
            element={
              <RouteErrorBoundary routeName="Swap History Report">
                <SwapHistoryReport />
              </RouteErrorBoundary>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <RouteErrorBoundary routeName="Settings">
                <Settings />
              </RouteErrorBoundary>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
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

        <h2 className="text-xl font-semibold text-gray-900">Staff Profile Not Found</h2>

        <p className="mt-2 text-gray-600">
          You have signed in as <strong>{azureUser?.email}</strong>, but we couldn't find a matching
          staff member record in CarePoint 365.
        </p>

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <p className="mt-4 text-sm text-gray-500">
          Please contact your administrator to ensure your email address is registered in the
          system.
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

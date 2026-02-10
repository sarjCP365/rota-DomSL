/**
 * DomiciliaryRota Page
 *
 * Main page for domiciliary care and supported living rota management.
 * Displays service users with their scheduled visits.
 */

import { Menu, RefreshCw, Home } from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { ServiceUserRotaGrid } from '@/components/rota/domiciliary';

export function DomiciliaryRota() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar - wrapped in error boundary for isolation */}
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar - Teal Gradient for Domiciliary */}
        <header className="shrink-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
              {/* Mobile menu toggle */}
              <button
                onClick={toggleSideNav}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-teal-500 transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Domiciliary Rota</h1>
                  <p className="text-sm text-teal-100 hidden sm:block">
                    Service user visits &amp; scheduling
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-teal-500 transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <FeatureErrorBoundary featureName="Service User Rota">
            <ServiceUserRotaGrid />
          </FeatureErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default DomiciliaryRota;

/**
 * Round Planning Page
 *
 * Geographic view for planning and managing visit rounds.
 */

import { useState } from 'react';
import { useSideNav, SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/Header';
import { RoundView } from '@/components/rota/domiciliary';
import { VisitDetailFlyout } from '@/components/rota/domiciliary';
import type { Visit } from '@/types/domiciliary';

export function RoundPlanning() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const pageTitle = 'Round Planning';
  const pageSubtitle = 'Geographic route planning and optimisation';

  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          onMenuToggle={toggleSideNav}
          onRefresh={() => window.location.reload()}
          variant="emerald"
        />

        <main className="flex-1 overflow-hidden p-4">
          <RoundView onVisitSelect={setSelectedVisit} />
        </main>
      </div>

      {/* Visit Detail Flyout */}
      <VisitDetailFlyout
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onSave={() => setSelectedVisit(null)}
        onAssign={() => {}}
      />
    </div>
  );
}

export default RoundPlanning;

/**
 * Settings Page
 * Application settings and configuration
 */

import { Header } from '@/components/common/Header';
import { SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState } from 'react';

export function Settings() {
  const [sideNavOpen, _setSideNavOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-elevation-1">
      <Header title="Settings" showBackButton onBack={() => window.history.back()} />

      <div className="flex flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Navigation">
          <SideNav isOpen={sideNavOpen} />
        </FeatureErrorBoundary>

        <main className="flex flex-1 flex-col overflow-auto bg-white p-6">
          <h2 className="mb-6 text-xl font-semibold">Application Settings</h2>

          <div className="max-w-2xl space-y-6">
            {/* Theme Settings */}
            <section className="rounded-lg border border-border-grey p-4">
              <h3 className="mb-4 font-medium">Theme</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    defaultChecked
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span>Light</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span>Dark</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span>System</span>
                </label>
              </div>
            </section>

            {/* Notification Settings */}
            <section className="rounded-lg border border-border-grey p-4">
              <h3 className="mb-4 font-medium">Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>Email notifications</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Push notifications</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </section>

            {/* About */}
            <section className="rounded-lg border border-border-grey p-4">
              <h3 className="mb-4 font-medium">About</h3>
              <p className="text-sm text-gray-600">
                CarePoint 365 Rota Application
                <br />
                Version 1.0.0
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

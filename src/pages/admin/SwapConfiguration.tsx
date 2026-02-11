/**
 * SwapConfiguration Page
 *
 * Admin page for configuring shift swap settings and rules.
 */

import { useState } from 'react';
import { Save, RefreshCw, Info, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import PageHeader from '@/components/common/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSwapConfiguration,
  updateSwapConfiguration,
  type SwapConfiguration,
} from '@/services/configurationService';

const DEFAULT_CONFIG: SwapConfiguration = {
  minNoticeHours: 24,
  maxSwapsPerWeek: 3,
  requireManagerApproval: true,
  allowOpenShifts: true,
  openShiftExpiryHours: 48,
  notifyAllSuitableStaff: true,
  minimumMatchScore: 60,
  considerContinuity: true,
  allowCrossTeamSwaps: false,
  autoApproveHighScore: false,
  autoApproveThreshold: 90,
};

export default function SwapConfigurationPage() {
  const { isOpen, close, toggle } = useSideNav();
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: swapConfig, isLoading } = useQuery({
    queryKey: ['swapConfiguration'],
    queryFn: getSwapConfiguration,
  });

  // Form state
  const [config, setConfig] = useState<SwapConfiguration>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);

  // Update form when config loads (adjust state during render)
  const [lastSyncedConfig, setLastSyncedConfig] = useState(swapConfig);
  if (swapConfig && swapConfig !== lastSyncedConfig) {
    setLastSyncedConfig(swapConfig);
    setConfig(swapConfig);
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: updateSwapConfiguration,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['swapConfiguration'] });
      setIsDirty(false);
    },
  });

  const handleChange = <K extends keyof SwapConfiguration>(
    key: K,
    value: SwapConfiguration[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <SideNav isOpen={isOpen} onClose={close} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Swap Configuration"
          subtitle="Configure shift swap rules and automation"
          onMenuClick={toggle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {!isLoading && (
            <div className="max-w-2xl space-y-6">
              {/* Info box */}
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Shift Swap Configuration
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    These settings control how shift swaps and open shifts are managed.
                    Changes take effect immediately.
                  </p>
                </div>
              </div>

              {/* Timing Settings */}
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Clock className="h-5 w-5 text-slate-400" />
                  Timing Rules
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="swap-min-notice" className="block text-sm font-medium text-slate-700 mb-1">
                      Minimum Notice Period (hours)
                    </label>
                    <input
                      type="number"
                      id="swap-min-notice"
                      min={0}
                      max={168}
                      value={config.minNoticeHours}
                      onChange={(e) => handleChange('minNoticeHours', parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Staff must request swaps this many hours before the shift starts.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="swap-max-per-week" className="block text-sm font-medium text-slate-700 mb-1">
                      Max Swaps Per Week
                    </label>
                    <input
                      type="number"
                      id="swap-max-per-week"
                      min={0}
                      max={20}
                      value={config.maxSwapsPerWeek}
                      onChange={(e) => handleChange('maxSwapsPerWeek', parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Maximum number of swaps allowed per staff member per week.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="swap-shift-expiry" className="block text-sm font-medium text-slate-700 mb-1">
                      Open Shift Expiry (hours)
                    </label>
                    <input
                      type="number"
                      id="swap-shift-expiry"
                      min={1}
                      max={168}
                      value={config.openShiftExpiryHours}
                      onChange={(e) => handleChange('openShiftExpiryHours', parseInt(e.target.value) || 24)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      How long open shifts remain available before requiring manual intervention.
                    </p>
                  </div>
                </div>
              </section>

              {/* Approval Settings */}
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <CheckCircle className="h-5 w-5 text-slate-400" />
                  Approval Rules
                </h2>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.requireManagerApproval}
                      onChange={(e) => handleChange('requireManagerApproval', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Require Manager Approval
                      </span>
                      <span className="text-xs text-slate-500">
                        All swap requests must be approved by a manager.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoApproveHighScore}
                      onChange={(e) => handleChange('autoApproveHighScore', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Auto-Approve High Score Matches
                      </span>
                      <span className="text-xs text-slate-500">
                        Automatically approve swaps when the replacement staff has a high match score.
                      </span>
                    </span>
                  </label>

                  {config.autoApproveHighScore && (
                    <div className="ml-7">
                      <label htmlFor="swap-auto-approve-threshold" className="block text-sm font-medium text-slate-700 mb-1">
                        Auto-Approve Threshold Score
                      </label>
                      <input
                        type="number"
                        id="swap-auto-approve-threshold"
                        min={50}
                        max={100}
                        value={config.autoApproveThreshold}
                        onChange={(e) => handleChange('autoApproveThreshold', parseInt(e.target.value) || 90)}
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Swaps are auto-approved when replacement staff score above this threshold.
                      </p>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allowCrossTeamSwaps}
                      onChange={(e) => handleChange('allowCrossTeamSwaps', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Allow Cross-Team Swaps
                      </span>
                      <span className="text-xs text-slate-500">
                        Staff can swap with colleagues from other teams/regions.
                      </span>
                    </span>
                  </label>
                </div>
              </section>

              {/* Open Shift Settings */}
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <AlertTriangle className="h-5 w-5 text-slate-400" />
                  Open Shift Settings
                </h2>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allowOpenShifts}
                      onChange={(e) => handleChange('allowOpenShifts', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Allow Open Shifts
                      </span>
                      <span className="text-xs text-slate-500">
                        Staff can request to give up shifts without a direct swap.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notifyAllSuitableStaff}
                      onChange={(e) => handleChange('notifyAllSuitableStaff', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Notify All Suitable Staff
                      </span>
                      <span className="text-xs text-slate-500">
                        Automatically notify all staff who match open shift criteria.
                      </span>
                    </span>
                  </label>

                  <div>
                    <label htmlFor="swap-min-match-score" className="block text-sm font-medium text-slate-700 mb-1">
                      Minimum Match Score for Open Shifts
                    </label>
                    <input
                      type="number"
                      id="swap-min-match-score"
                      min={0}
                      max={100}
                      value={config.minimumMatchScore}
                      onChange={(e) => handleChange('minimumMatchScore', parseInt(e.target.value) || 0)}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Only staff with match scores above this threshold are considered for open shifts.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.considerContinuity}
                      onChange={(e) => handleChange('considerContinuity', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">
                        Prioritise Continuity of Care
                      </span>
                      <span className="text-xs text-slate-500">
                        Give preference to staff who have previously worked with the service user.
                      </span>
                    </span>
                  </label>
                </div>
              </section>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => saveMutation.mutate(config)}
                  disabled={!isDirty || saveMutation.isPending}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
                    isDirty
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {saveMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

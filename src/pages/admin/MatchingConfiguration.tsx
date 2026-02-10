/**
 * MatchingConfiguration Page
 *
 * Admin page for configuring staff matching algorithm weights by care type.
 */

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Info, BarChart3 } from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import PageHeader from '@/components/common/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMatchingConfiguration,
  updateMatchingWeights,
} from '@/services/configurationService';
import {
  type CareType,
  type MatchScoreWeights,
  getCareTypeLabel,
  DEFAULT_MATCHING_WEIGHTS,
  requiresTravelScoring,
} from '@/services/careContext';

const CARE_TYPES: CareType[] = ['residential', 'domiciliary', 'supported_living', 'extra_care', 'live_in'];

interface WeightEditorProps {
  careType: CareType;
  weights: MatchScoreWeights;
  onChange: (weights: MatchScoreWeights) => void;
  showTravel: boolean;
}

function WeightEditor({ careType, weights, onChange, showTravel }: WeightEditorProps) {
  const total = weights.availability + weights.continuity + weights.skills + weights.preference + weights.travel;
  const isValid = total === 100;

  const handleChange = (field: keyof MatchScoreWeights, value: number) => {
    onChange({
      ...weights,
      [field]: Math.max(0, Math.min(100, value)),
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{getCareTypeLabel(careType)}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          Total: {total}/100
        </span>
      </div>

      <div className="space-y-3">
        {/* Availability */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm text-slate-600">Availability</label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights.availability}
            onChange={(e) => handleChange('availability', parseInt(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-emerald-600"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={weights.availability}
            onChange={(e) => handleChange('availability', parseInt(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>

        {/* Continuity */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm text-slate-600">Continuity</label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights.continuity}
            onChange={(e) => handleChange('continuity', parseInt(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-emerald-600"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={weights.continuity}
            onChange={(e) => handleChange('continuity', parseInt(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>

        {/* Skills */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm text-slate-600">Skills</label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights.skills}
            onChange={(e) => handleChange('skills', parseInt(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-emerald-600"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={weights.skills}
            onChange={(e) => handleChange('skills', parseInt(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>

        {/* Preference */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm text-slate-600">Preference</label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights.preference}
            onChange={(e) => handleChange('preference', parseInt(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-emerald-600"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={weights.preference}
            onChange={(e) => handleChange('preference', parseInt(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>

        {/* Travel (only for applicable care types) */}
        <div className="flex items-center gap-4">
          <label className={`w-32 text-sm ${showTravel ? 'text-slate-600' : 'text-slate-400'}`}>
            Travel
            {!showTravel && <span className="text-xs"> (N/A)</span>}
          </label>
          <input
            type="range"
            min={0}
            max={50}
            value={weights.travel}
            onChange={(e) => handleChange('travel', parseInt(e.target.value))}
            disabled={!showTravel}
            className={`flex-1 h-2 rounded-lg appearance-none ${
              showTravel ? 'bg-slate-200 accent-emerald-600' : 'bg-slate-100'
            }`}
          />
          <input
            type="number"
            min={0}
            max={100}
            value={weights.travel}
            onChange={(e) => handleChange('travel', parseInt(e.target.value) || 0)}
            disabled={!showTravel}
            className={`w-16 rounded border px-2 py-1 text-center text-sm ${
              showTravel ? 'border-slate-300' : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Visual bar chart */}
      <div className="mt-4 flex h-4 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${weights.availability}%` }}
          title={`Availability: ${weights.availability}%`}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${weights.continuity}%` }}
          title={`Continuity: ${weights.continuity}%`}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${weights.skills}%` }}
          title={`Skills: ${weights.skills}%`}
        />
        <div
          className="bg-purple-500 transition-all"
          style={{ width: `${weights.preference}%` }}
          title={`Preference: ${weights.preference}%`}
        />
        {showTravel && (
          <div
            className="bg-rose-500 transition-all"
            style={{ width: `${weights.travel}%` }}
            title={`Travel: ${weights.travel}%`}
          />
        )}
      </div>

      <div className="mt-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Availability
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span> Continuity
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span> Skills
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500"></span> Preference
        </span>
        {showTravel && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Travel
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatchingConfigurationPage() {
  const { isOpen, close, toggle } = useSideNav();
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: matchingConfig, isLoading } = useQuery({
    queryKey: ['matchingConfiguration'],
    queryFn: getMatchingConfiguration,
  });

  // Form state
  const [weightsByCareType, setWeightsByCareType] = useState<Record<CareType, MatchScoreWeights>>(
    DEFAULT_MATCHING_WEIGHTS
  );
  const [isDirty, setIsDirty] = useState(false);
  const [selectedCareType, setSelectedCareType] = useState<CareType>('domiciliary');

  // Update form when config loads
  useEffect(() => {
    if (matchingConfig) {
      setWeightsByCareType(matchingConfig.weightsByCareType);
    }
  }, [matchingConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        CARE_TYPES.map(careType =>
          updateMatchingWeights(careType, weightsByCareType[careType])
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchingConfiguration'] });
      setIsDirty(false);
    },
  });

  const handleWeightChange = (careType: CareType, weights: MatchScoreWeights) => {
    setWeightsByCareType(prev => ({
      ...prev,
      [careType]: weights,
    }));
    setIsDirty(true);
  };

  const resetToDefaults = (careType: CareType) => {
    handleWeightChange(careType, DEFAULT_MATCHING_WEIGHTS[careType]);
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <SideNav isOpen={isOpen} onClose={close} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Matching Configuration"
          subtitle="Configure staff matching algorithm weights by care type"
          onMenuClick={toggle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {!isLoading && (
            <div className="max-w-4xl space-y-6">
              {/* Info box */}
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Matching Weight Configuration
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    Adjust how different factors influence staff-to-assignment matching.
                    Weights must total 100%. Travel scoring only applies to domiciliary care.
                  </p>
                </div>
              </div>

              {/* Care type tabs */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                {CARE_TYPES.map((careType) => (
                  <button
                    key={careType}
                    onClick={() => setSelectedCareType(careType)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCareType === careType
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {getCareTypeLabel(careType)}
                  </button>
                ))}
              </div>

              {/* Weight editor for selected care type */}
              <WeightEditor
                careType={selectedCareType}
                weights={weightsByCareType[selectedCareType]}
                onChange={(weights) => handleWeightChange(selectedCareType, weights)}
                showTravel={requiresTravelScoring(selectedCareType)}
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={() => resetToDefaults(selectedCareType)}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Reset to defaults
                </button>

                <button
                  onClick={() => saveMutation.mutate()}
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

              {/* Weight comparison chart */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                  Weight Comparison Across Care Types
                </h2>

                <div className="space-y-3">
                  {CARE_TYPES.map((careType) => {
                    const weights = weightsByCareType[careType];
                    return (
                      <div key={careType} className="flex items-center gap-4">
                        <span className="w-40 text-sm text-slate-600">
                          {getCareTypeLabel(careType)}
                        </span>
                        <div className="flex-1 flex h-6 rounded overflow-hidden bg-slate-100">
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${weights.availability}%` }}
                          />
                          <div
                            className="bg-blue-500"
                            style={{ width: `${weights.continuity}%` }}
                          />
                          <div
                            className="bg-amber-500"
                            style={{ width: `${weights.skills}%` }}
                          />
                          <div
                            className="bg-purple-500"
                            style={{ width: `${weights.preference}%` }}
                          />
                          {requiresTravelScoring(careType) && (
                            <div
                              className="bg-rose-500"
                              style={{ width: `${weights.travel}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Availability
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span> Continuity
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span> Skills
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span> Preference
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span> Travel (domiciliary only)
                  </span>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

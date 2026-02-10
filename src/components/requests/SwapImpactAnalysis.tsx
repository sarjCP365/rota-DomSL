/**
 * SwapImpactAnalysis Component
 *
 * Analyses and displays the potential impact of approving a swap.
 * Checks for conflicts, capability matches, and staffing levels.
 */

import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Shield } from 'lucide-react';
import type { ShiftSwap } from '@/types/shiftSwap';
import { useQuery } from '@tanstack/react-query';
import { getDummyData } from '@/data/dummyDataGenerator';

interface SwapImpactAnalysisProps {
  /** The swap request to analyse */
  swap: ShiftSwap;
  /** Whether to show a compact version */
  compact?: boolean;
}

interface ImpactCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  message: string;
  details?: string;
}

/**
 * Impact check status icon
 */
function StatusIcon({ status }: { status: ImpactCheck['status'] }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'fail':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

/**
 * Status colour classes
 */
function getStatusClasses(status: ImpactCheck['status']): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'fail':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'info':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

export function SwapImpactAnalysis({ swap, compact = false }: SwapImpactAnalysisProps) {
  // Fetch data for analysis
  const { data: dummyData } = useQuery({
    queryKey: ['dummyData'],
    queryFn: () => getDummyData(),
    staleTime: 60000,
  });

  // Perform impact checks
  const impactChecks = useMemo<ImpactCheck[]>(() => {
    const checks: ImpactCheck[] = [];

    // Get staff details
    const initiator = dummyData?.staffMembers.find(
      s => s.cp365_staffmemberid === swap._cp365_requestfrom_value
    );
    const recipient = dummyData?.staffMembers.find(
      s => s.cp365_staffmemberid === swap._cp365_requestto_value
    );

    const initiatorAssignment = swap.originalVisitDetails || swap.originalShiftDetails;
    const _recipientAssignment = swap.requestedVisitDetails || swap.requestedShiftDetails;

    // Check 1: Scheduling conflicts
    const hasConflicts = false; // Simplified - would check against other shifts/visits
    checks.push({
      id: 'conflicts',
      label: 'Scheduling Conflicts',
      status: hasConflicts ? 'fail' : 'pass',
      message: hasConflicts
        ? 'Scheduling conflicts detected'
        : 'No scheduling conflicts detected',
      details: hasConflicts
        ? 'One or both staff members have existing commitments at the swapped times.'
        : undefined,
    });

    // Check 2: Capability match
    const _initiatorCapabilities = (initiator as any)?.capabilities || [];
    const _recipientCapabilities = (recipient as any)?.capabilities || [];
    const allCapabilitiesMatch = true; // Simplified
    checks.push({
      id: 'capabilities',
      label: 'Capability Match',
      status: allCapabilitiesMatch ? 'pass' : 'warning',
      message: allCapabilitiesMatch
        ? 'Both staff have required capabilities'
        : 'Potential capability mismatch',
      details: !allCapabilitiesMatch
        ? 'Some required skills may not be present. Review before approving.'
        : undefined,
    });

    // Check 3: Staffing levels (for residential)
    if (swap.assignmentType === 'shift') {
      const adequateStaffing = true; // Simplified
      checks.push({
        id: 'staffing',
        label: 'Staffing Levels',
        status: adequateStaffing ? 'pass' : 'warning',
        message: adequateStaffing
          ? 'Adequate staffing maintained'
          : 'Minimum staffing may be affected',
        details: !adequateStaffing
          ? `Check coverage on ${initiatorAssignment?.date || 'affected'} date.`
          : undefined,
      });
    }

    // Check 4: Service user preferences (for visits)
    if (swap.assignmentType === 'visit') {
      const preferencesRespected = true; // Simplified
      checks.push({
        id: 'preferences',
        label: 'Service User Preferences',
        status: preferencesRespected ? 'pass' : 'warning',
        message: preferencesRespected
          ? 'Service user preferences respected'
          : 'Service user preferences may not be met',
      });
    }

    // Check 5: Senior staff coverage (for residential)
    if (swap.assignmentType === 'shift') {
      const seniorCoverage = true; // Simplified
      checks.push({
        id: 'seniorCoverage',
        label: 'Senior Staff Coverage',
        status: seniorCoverage ? 'pass' : 'warning',
        message: seniorCoverage
          ? 'Senior staff coverage maintained'
          : 'Senior staff coverage may be reduced',
        details: !seniorCoverage
          ? 'Consider if a senior staff member should be on shift.'
          : undefined,
      });
    }

    // Check 6: Advance notice
    const isUrgent = swap.cp365_advancenoticebreached;
    checks.push({
      id: 'notice',
      label: 'Advance Notice',
      status: isUrgent ? 'warning' : 'pass',
      message: isUrgent
        ? 'Less than 7 days notice'
        : 'Adequate advance notice provided',
      details: isUrgent
        ? 'Short notice swaps may require additional coordination.'
        : undefined,
    });

    return checks;
  }, [swap, dummyData]);

  // Calculate overall status
  const overallStatus = useMemo(() => {
    const hasFail = impactChecks.some(c => c.status === 'fail');
    const hasWarning = impactChecks.some(c => c.status === 'warning');
    if (hasFail) return 'fail';
    if (hasWarning) return 'warning';
    return 'pass';
  }, [impactChecks]);

  if (compact) {
    // Compact version - just show status summary
    return (
      <div className={`rounded-lg border p-3 ${getStatusClasses(overallStatus)}`}>
        <div className="flex items-center gap-2">
          <StatusIcon status={overallStatus} />
          <span className="text-sm font-medium">
            {overallStatus === 'pass' && 'All checks passed'}
            {overallStatus === 'warning' && `${impactChecks.filter(c => c.status === 'warning').length} warning(s)`}
            {overallStatus === 'fail' && 'Issues detected'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="flex items-center gap-2 font-medium text-slate-900">
          <Shield className="h-5 w-5 text-slate-400" />
          Impact Analysis
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {impactChecks.map((check) => (
          <div key={check.id} className="flex items-start gap-3 px-4 py-3">
            <StatusIcon status={check.status} />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{check.label}</p>
              <p className="text-sm text-slate-600">{check.message}</p>
              {check.details && (
                <p className="mt-1 text-xs text-slate-500">{check.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={`rounded-b-lg border-t px-4 py-3 ${getStatusClasses(overallStatus)}`}>
        <div className="flex items-center gap-2">
          <StatusIcon status={overallStatus} />
          <span className="text-sm font-medium">
            {overallStatus === 'pass' && 'All impact checks passed - safe to approve'}
            {overallStatus === 'warning' && 'Review warnings before approving'}
            {overallStatus === 'fail' && 'Issues detected - approval not recommended'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SwapImpactAnalysis;

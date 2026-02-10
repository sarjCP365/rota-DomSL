/**
 * StaffSuitabilityBadge Component
 *
 * Displays staff suitability score with breakdown indicators.
 * Used in both CreateVisitModal and VisitDetailFlyout.
 */

import React from 'react';
import {
  Star,
  Clock,
  Heart,
  Award,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { MatchResult } from '@/services/staffMatching';

interface StaffSuitabilityBadgeProps {
  /** Match result with score and breakdown */
  matchResult: MatchResult;
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'inline';
  /** Show breakdown tooltip on hover */
  showTooltip?: boolean;
}

/**
 * Get score colour based on value
 */
function getScoreColour(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Get score background based on value
 */
function getScoreBackground(score: number): string {
  if (score >= 80) return 'bg-green-100 border-green-200';
  if (score >= 60) return 'bg-blue-100 border-blue-200';
  if (score >= 40) return 'bg-amber-100 border-amber-200';
  return 'bg-red-100 border-red-200';
}

/**
 * Score indicator component
 */
function ScoreIndicator({
  label,
  score,
  maxScore,
  icon: Icon,
}: {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ElementType;
}) {
  const percentage = (score / maxScore) * 100;
  const colour = percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-amber-600' : 'text-gray-400';

  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`w-3.5 h-3.5 ${colour}`} />
      <span className="text-gray-600 min-w-[70px]">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-gray-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`min-w-[35px] text-right font-medium ${colour}`}>
        {score}/{maxScore}
      </span>
    </div>
  );
}

/**
 * StaffSuitabilityBadge component
 */
export const StaffSuitabilityBadge: React.FC<StaffSuitabilityBadgeProps> = ({
  matchResult,
  variant = 'compact',
  showTooltip = true,
}) => {
  const { score, breakdown, isAvailable, hasRequiredSkills, warnings } = matchResult;
  const scoreColour = getScoreColour(score);
  const scoreBg = getScoreBackground(score);

  // Compact variant - just the score badge
  if (variant === 'compact') {
    return (
      <div className="group relative inline-block">
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-help ${scoreBg} ${scoreColour}`}
        >
          <Star className="w-3 h-3" />
          {score}
        </div>

        {/* Tooltip on hover - positioned to avoid overflow */}
        {showTooltip && (
          <div className="fixed z-[100] hidden group-hover:block pointer-events-none" 
               style={{ 
                 position: 'absolute',
                 right: 0,
                 top: '100%',
                 marginTop: '4px',
               }}>
            <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-64 pointer-events-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">Suitability Score</span>
                <span className={`text-lg font-bold ${scoreColour}`}>{score}/100</span>
              </div>

              <div className="space-y-2">
                <ScoreIndicator
                  label="Availability"
                  score={breakdown.availabilityScore}
                  maxScore={30}
                  icon={Clock}
                />
                <ScoreIndicator
                  label="Continuity"
                  score={breakdown.continuityScore}
                  maxScore={25}
                  icon={Heart}
                />
                <ScoreIndicator
                  label="Skills"
                  score={breakdown.skillsScore}
                  maxScore={20}
                  icon={Award}
                />
                <ScoreIndicator
                  label="Preference"
                  score={breakdown.preferenceScore}
                  maxScore={15}
                  icon={Star}
                />
                <ScoreIndicator
                  label="Travel"
                  score={breakdown.travelScore}
                  maxScore={10}
                  icon={MapPin}
                />
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status indicators */}
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs">
                <span className={`flex items-center gap-1 ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {isAvailable ? 'Available' : 'Unavailable'}
                </span>
                <span className={`flex items-center gap-1 ${hasRequiredSkills ? 'text-green-600' : 'text-amber-600'}`}>
                  {hasRequiredSkills ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {hasRequiredSkills ? 'Skills OK' : 'Skills gap'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline variant - compact horizontal display
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${scoreBg} ${scoreColour}`}>
          <Star className="w-3 h-3" />
          {score}
        </span>
        {isAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" title="Available" />}
        {!isAvailable && <XCircle className="w-3.5 h-3.5 text-red-500" title="Unavailable" />}
        {breakdown.continuityScore >= 15 && <Heart className="w-3.5 h-3.5 text-pink-500" title="Previous visits" />}
        {breakdown.preferenceScore >= 10 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" title="Preferred carer" />}
        {warnings.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title={warnings.join(', ')} />}
      </div>
    );
  }

  // Detailed variant - full breakdown display
  return (
    <div className={`p-3 rounded-lg border ${scoreBg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">Match Score</span>
        <div className={`text-2xl font-bold ${scoreColour}`}>{score}<span className="text-sm text-gray-500">/100</span></div>
      </div>

      <div className="space-y-2">
        <ScoreIndicator
          label="Availability"
          score={breakdown.availabilityScore}
          maxScore={30}
          icon={Clock}
        />
        <ScoreIndicator
          label="Continuity"
          score={breakdown.continuityScore}
          maxScore={25}
          icon={Heart}
        />
        <ScoreIndicator
          label="Skills"
          score={breakdown.skillsScore}
          maxScore={20}
          icon={Award}
        />
        <ScoreIndicator
          label="Preference"
          score={breakdown.preferenceScore}
          maxScore={15}
          icon={Star}
        />
        <ScoreIndicator
          label="Travel"
          score={breakdown.travelScore}
          maxScore={10}
          icon={MapPin}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          {warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status summary */}
      <div className="mt-3 pt-2 border-t border-gray-200 flex items-center gap-4 text-xs">
        <span className={`flex items-center gap-1 ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
          {isAvailable ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {isAvailable ? 'Available at this time' : 'Not available'}
        </span>
        <span className={`flex items-center gap-1 ${hasRequiredSkills ? 'text-green-600' : 'text-amber-600'}`}>
          {hasRequiredSkills ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {hasRequiredSkills ? 'Has required skills' : 'Missing some skills'}
        </span>
      </div>
    </div>
  );
};

export default StaffSuitabilityBadge;

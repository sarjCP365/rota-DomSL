/**
 * DepartmentSection Component
 * Collapsible section for grouping shifts by department
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 5
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Users, Building2, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type DepartmentType = 'regular' | 'agency' | 'other-locations' | 'unassigned';

export interface DepartmentData {
  id: string;
  name: string;
  type?: DepartmentType;
}

interface DepartmentSectionProps {
  /** Department information */
  department: DepartmentData;
  /** Number of staff/shifts in this department */
  staffCount: number;
  /** Whether the section is expanded */
  isExpanded: boolean;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Content to render inside the section */
  children: React.ReactNode;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Empty state message when no shifts */
  emptyMessage?: string;
  /** Show the section even when empty */
  showWhenEmpty?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DepartmentSection({
  department,
  staffCount,
  isExpanded,
  onToggle,
  children,
  isLoading = false,
  emptyMessage = 'No shifts match the current filters',
  showWhenEmpty = false,
}: DepartmentSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const [isAnimating, setIsAnimating] = useState(false);

  // Get styling based on department type
  const departmentType = department.type || 'regular';
  const styles = getDepartmentStyles(departmentType);

  // -------------------------------------------------------------------------
  // Animation handling
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!contentRef.current) return;

    if (isExpanded) {
      // Expanding: measure content height, animate from 0 to measured height
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      setIsAnimating(true);
      
      // After animation, set to auto for dynamic content
      const timer = setTimeout(() => {
        setContentHeight('auto');
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      // Collapsing: set explicit height first, then animate to 0
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight;
        setContentHeight(height);
        setIsAnimating(true);
        
        // Force reflow then set to 0
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setContentHeight(0);
          });
        });
        
        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isExpanded]);

  // -------------------------------------------------------------------------
  // Keyboard handling
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  // -------------------------------------------------------------------------
  // Don't render if empty and not showing when empty
  // -------------------------------------------------------------------------

  if (staffCount === 0 && !showWhenEmpty && !isLoading) {
    return null;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div 
      className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow duration-200 ${
        isExpanded ? 'shadow-md' : ''
      } ${styles.borderColour}`}
    >
      {/* Department Header - Larger tap target on mobile */}
      <button
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between px-3 py-3 sm:px-4 sm:py-3 text-left transition-colors ${styles.headerBg} ${styles.hoverBg} active:bg-gray-200`}
        aria-expanded={isExpanded}
        aria-controls={`dept-content-${department.id}`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Expand/Collapse Icon */}
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
            )}
          </span>

          {/* Department Icon - Hidden on mobile to save space */}
          <span className={`hidden sm:flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
            {departmentType === 'unassigned' ? (
              <AlertCircle className={`h-4 w-4 ${styles.iconColour}`} />
            ) : departmentType === 'agency' ? (
              <Users className={`h-4 w-4 ${styles.iconColour}`} />
            ) : departmentType === 'other-locations' ? (
              <Building2 className={`h-4 w-4 ${styles.iconColour}`} />
            ) : (
              <Users className={`h-4 w-4 ${styles.iconColour}`} />
            )}
          </span>

          {/* Department Name */}
          <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{department.name}</span>

          {/* Type Badge for special sections - hidden on very small screens */}
          {departmentType === 'unassigned' && (
            <span className="hidden xs:inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-amber-800 flex-shrink-0">
              Needs Assignment
            </span>
          )}
          {departmentType === 'agency' && (
            <span className="hidden xs:inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-orange-800 flex-shrink-0">
              Agency
            </span>
          )}
          {departmentType === 'other-locations' && (
            <span className="hidden xs:inline-flex rounded bg-gray-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-gray-600 flex-shrink-0">
              External
            </span>
          )}
        </div>

        {/* Staff Count Badge */}
        <span className={`rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium flex-shrink-0 ${styles.badgeBg} ${styles.badgeText}`}>
          {staffCount}
        </span>
      </button>

      {/* Left Border Accent */}
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.accentColour}`} />

      {/* Collapsible Content */}
      <div
        ref={contentRef}
        id={`dept-content-${department.id}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isAnimating ? '' : isExpanded ? '' : 'hidden'
        }`}
        style={{
          height: isAnimating || isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        aria-hidden={!isExpanded}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-gray-500">Loading shifts...</span>
          </div>
        ) : staffCount === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Styling Helper
// =============================================================================

interface DepartmentStyles {
  borderColour: string;
  headerBg: string;
  hoverBg: string;
  accentColour: string;
  iconBg: string;
  iconColour: string;
  badgeBg: string;
  badgeText: string;
}

function getDepartmentStyles(type: DepartmentType): DepartmentStyles {
  switch (type) {
    case 'unassigned':
      return {
        borderColour: 'border-amber-300',
        headerBg: 'bg-amber-50',
        hoverBg: 'hover:bg-amber-100',
        accentColour: 'bg-amber-500',
        iconBg: 'bg-amber-100',
        iconColour: 'text-amber-600',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
      };
    case 'agency':
      return {
        borderColour: 'border-orange-200',
        headerBg: 'bg-orange-50',
        hoverBg: 'hover:bg-orange-100',
        accentColour: 'bg-orange-500',
        iconBg: 'bg-orange-100',
        iconColour: 'text-orange-600',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-700',
      };
    case 'other-locations':
      return {
        borderColour: 'border-gray-300',
        headerBg: 'bg-gray-100',
        hoverBg: 'hover:bg-gray-200',
        accentColour: 'bg-gray-400',
        iconBg: 'bg-gray-200',
        iconColour: 'text-gray-600',
        badgeBg: 'bg-gray-200',
        badgeText: 'text-gray-700',
      };
    default:
      return {
        borderColour: 'border-border-grey',
        headerBg: 'bg-gray-50',
        hoverBg: 'hover:bg-gray-100',
        accentColour: 'bg-primary',
        iconBg: 'bg-primary/10',
        iconColour: 'text-primary',
        badgeBg: 'bg-gray-200',
        badgeText: 'text-gray-700',
      };
  }
}

export default DepartmentSection;


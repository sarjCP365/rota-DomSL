/**
 * RotaLegend Component
 *
 * Displays a legend explaining the visual indicators on the rota grid.
 * Shows shift types, badges, and special states with colour coding.
 *
 * Features:
 * - Horizontal bar layout below filters
 * - Colour-coded shift type indicators
 * - Badge explanations (Fire Marshal, First Aider, etc.)
 * - Interactive filtering (optional)
 * - Responsive wrapping
 * - Collapsible on mobile
 */

import { useState } from 'react';
import { Flame, Heart, User, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type LegendItemType =
  | 'fireWarden'
  | 'firstAider'
  | 'dayShift'
  | 'nightShift'
  | 'sleepIn'
  | 'annualLeave'
  | 'sickLeave'
  | 'training'
  | 'unassigned'
  | 'overtime'
  | 'shiftLeader'
  | 'actUp'
  | 'senior'
  | 'unpublished';

interface RotaLegendProps {
  /** Callback when a legend item is clicked for filtering */
  onFilterByType?: (type: LegendItemType) => void;
  /** Currently active filter types */
  activeFilters?: LegendItemType[];
  /** Whether to show the legend in compact mode */
  compact?: boolean;
  /** Whether the legend is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

interface LegendItem {
  type: LegendItemType;
  label: string;
  icon?: React.ReactNode;
  emoji?: string;
  bgColor: string;
  textColor?: string;
  borderStyle?: string;
  badge?: string;
  tooltip: string;
}

// =============================================================================
// LEGEND ITEMS CONFIGURATION
// =============================================================================

const LEGEND_ITEMS: LegendItem[] = [
  // Shift Types
  {
    type: 'dayShift',
    label: 'Day Shift',
    emoji: '☀️',
    bgColor: 'bg-[#FCE4B4]',
    tooltip: 'Shifts starting between 06:00 and 20:00',
  },
  {
    type: 'nightShift',
    label: 'Night Shift',
    emoji: '🌙',
    bgColor: 'bg-[#BEDAE3]',
    tooltip: 'Shifts starting between 20:00 and 06:00',
  },
  {
    type: 'sleepIn',
    label: 'Sleep In',
    emoji: '🛏️',
    bgColor: 'bg-[#D3C7E6]',
    tooltip: 'Sleep-in shifts with reduced activity period',
  },
  {
    type: 'overtime',
    label: 'Overtime',
    emoji: '⏰',
    bgColor: 'bg-[#E3826F]',
    textColor: 'text-white',
    tooltip: 'Additional hours beyond contracted time',
  },

  // Leave Types
  {
    type: 'annualLeave',
    label: 'Annual Leave',
    icon: <User className="h-3.5 w-3.5" />,
    bgColor: 'bg-[#FFF3E0]',
    borderStyle: 'border border-orange-300',
    tooltip: 'Staff member on approved annual leave',
  },
  {
    type: 'sickLeave',
    label: 'Sick Leave',
    icon: <User className="h-3.5 w-3.5" />,
    bgColor: 'bg-red-50',
    borderStyle: 'border border-red-300',
    tooltip: 'Staff member on sick leave',
  },
  {
    type: 'training',
    label: 'Training',
    icon: <User className="h-3.5 w-3.5" />,
    bgColor: 'bg-blue-50',
    borderStyle: 'border border-blue-300',
    tooltip: 'Staff member attending training',
  },

  // Special States
  {
    type: 'unassigned',
    label: 'Unassigned',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    bgColor: 'bg-[#FFEBEE]',
    borderStyle: 'border-2 border-dashed border-gray-500',
    tooltip: 'Shift without an assigned staff member',
  },
  {
    type: 'unpublished',
    label: 'Unpublished',
    badge: '*',
    bgColor: 'bg-gray-100',
    tooltip: 'Shift not yet published to staff',
  },

  // Qualifications/Badges
  {
    type: 'fireWarden',
    label: 'Fire Warden',
    icon: <Flame className="h-3.5 w-3.5 text-orange-600" />,
    badge: 'FW',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    tooltip: 'Staff member is a trained Fire Warden',
  },
  {
    type: 'firstAider',
    label: 'First Aider',
    icon: <Heart className="h-3.5 w-3.5 text-red-600" />,
    badge: 'FA',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    tooltip: 'Staff member is a qualified First Aider',
  },
  {
    type: 'shiftLeader',
    label: 'Shift Leader',
    badge: 'SL',
    bgColor: 'bg-primary/20',
    textColor: 'text-primary',
    tooltip: 'Designated shift leader for the team',
  },
  {
    type: 'actUp',
    label: 'Act Up',
    badge: 'AU',
    bgColor: 'bg-secondary/20',
    textColor: 'text-secondary',
    tooltip: 'Staff member acting up in a senior role',
  },
  {
    type: 'senior',
    label: 'Senior',
    badge: 'SR',
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-700',
    tooltip: 'Senior staff member',
  },
];

// Group items by category for organised display
const SHIFT_TYPES = LEGEND_ITEMS.filter((i) =>
  ['dayShift', 'nightShift', 'sleepIn', 'overtime'].includes(i.type)
);

const LEAVE_TYPES = LEGEND_ITEMS.filter((i) =>
  ['annualLeave', 'sickLeave', 'training'].includes(i.type)
);

const BADGES = LEGEND_ITEMS.filter((i) =>
  ['fireWarden', 'firstAider', 'shiftLeader', 'actUp', 'senior'].includes(i.type)
);

const SPECIAL_STATES = LEGEND_ITEMS.filter((i) => ['unassigned', 'unpublished'].includes(i.type));

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RotaLegend({
  onFilterByType,
  activeFilters = [],
  compact = false,
  collapsible = true,
  defaultCollapsed = false,
}: RotaLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [hoveredItem, setHoveredItem] = useState<LegendItemType | null>(null);

  const handleItemClick = (type: LegendItemType) => {
    if (onFilterByType) {
      onFilterByType(type);
    }
  };

  const isActive = (type: LegendItemType) => activeFilters.includes(type);

  // Render a single legend item
  const renderItem = (item: LegendItem) => {
    const active = isActive(item.type);
    const isInteractive = !!onFilterByType;
    const isHovered = hoveredItem === item.type;

    return (
      <div
        key={item.type}
        className="relative"
        onMouseEnter={() => setHoveredItem(item.type)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <button
          onClick={() => handleItemClick(item.type)}
          disabled={!isInteractive}
          className={`
            flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all
            ${item.bgColor}
            ${item.textColor || 'text-gray-700'}
            ${item.borderStyle || ''}
            ${isInteractive ? 'cursor-pointer hover:shadow-md hover:brightness-95' : 'cursor-default'}
            ${active ? 'ring-2 ring-primary ring-offset-1' : ''}
          `}
        >
          {/* Icon or emoji */}
          {item.emoji && (
            <span className="text-sm" role="img" aria-label={item.label}>
              {item.emoji}
            </span>
          )}
          {item.icon && !item.emoji && item.icon}

          {/* Badge */}
          {item.badge && !item.emoji && !item.icon && (
            <span className={`font-bold ${item.textColor || ''}`}>{item.badge}</span>
          )}

          {/* Label */}
          {!compact && <span className="whitespace-nowrap font-medium">{item.label}</span>}
        </button>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
            {item.tooltip}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-border-grey bg-gray-50">
      {/* Header with collapse toggle */}
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-100 md:hidden"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Legend</span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          )}
        </button>
      )}

      {/* Legend content */}
      <div
        className={`
          overflow-hidden transition-all duration-200
          ${collapsible && isCollapsed ? 'max-h-0 md:max-h-none' : 'max-h-96'}
        `}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          {/* Desktop: Show categories inline */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-xs font-semibold text-gray-600">Legend:</span>
          </div>

          {/* Shift Types */}
          <div className="flex flex-wrap items-center gap-1.5">{SHIFT_TYPES.map(renderItem)}</div>

          {/* Separator */}
          <div className="hidden h-4 w-px bg-gray-300 md:block" />

          {/* Leave Types */}
          <div className="flex flex-wrap items-center gap-1.5">{LEAVE_TYPES.map(renderItem)}</div>

          {/* Separator */}
          <div className="hidden h-4 w-px bg-gray-300 md:block" />

          {/* Special States */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SPECIAL_STATES.map(renderItem)}
          </div>

          {/* Separator */}
          <div className="hidden h-4 w-px bg-gray-300 md:block" />

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">{BADGES.map(renderItem)}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT INLINE LEGEND
// =============================================================================

/**
 * A more compact version of the legend for use in tight spaces
 */
export function RotaLegendCompact() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-[#FCE4B4]" />
        <span>Day</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-[#BEDAE3]" />
        <span>Night</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-[#D3C7E6]" />
        <span>Sleep</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-gray-400 bg-red-50" />
        <span>Unassigned</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold text-gray-500">*</span>
        <span>Unpublished</span>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { RotaLegendProps, LegendItem };

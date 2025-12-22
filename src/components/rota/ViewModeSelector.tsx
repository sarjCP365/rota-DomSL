/**
 * ViewModeSelector Component
 * Dropdown selectors for switching between rota view modes and detail levels
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Layers, Clock, Eye, List, Minus } from 'lucide-react';
import type { ViewMode, DetailLevel } from '../../store/rotaStore';

// =============================================================================
// TYPES
// =============================================================================

interface ViewModeOption {
  value: ViewMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface DetailLevelOption {
  value: DetailLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  detailLevel: DetailLevel;
  onViewModeChange: (mode: ViewMode) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// =============================================================================
// OPTIONS
// =============================================================================

const viewModeOptions: ViewModeOption[] = [
  {
    value: 'team',
    label: 'View by Team',
    description: 'Grouped by Unit → Team → Staff',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    value: 'people',
    label: 'View by People',
    description: 'Flat list of staff members',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'shiftReference',
    label: 'View by Shift Reference',
    description: 'Coverage by shift type',
    icon: <Clock className="h-4 w-4" />,
  },
];

const detailLevelOptions: DetailLevelOption[] = [
  {
    value: 'detailed',
    label: 'Detailed View',
    description: 'Shows all shift information',
    icon: <Eye className="h-4 w-4" />,
  },
  {
    value: 'compact',
    label: 'Compact View',
    description: 'Minimal information',
    icon: <List className="h-4 w-4" />,
  },
  {
    value: 'hoursOnly',
    label: 'Hours Only',
    description: 'Just hours, no details',
    icon: <Minus className="h-4 w-4" />,
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ViewModeSelector({
  viewMode,
  detailLevel,
  onViewModeChange,
  onDetailLevelChange,
  disabled = false,
}: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <ViewModeDropdown
        value={viewMode}
        options={viewModeOptions}
        onChange={onViewModeChange}
        disabled={disabled}
      />
      <DetailLevelDropdown
        value={detailLevel}
        options={detailLevelOptions}
        onChange={onDetailLevelChange}
        disabled={disabled}
      />
    </div>
  );
}

// =============================================================================
// VIEW MODE DROPDOWN
// =============================================================================

interface ViewModeDropdownProps {
  value: ViewMode;
  options: ViewModeOption[];
  onChange: (value: ViewMode) => void;
  disabled: boolean;
}

function ViewModeDropdown({ value, options, onChange, disabled }: ViewModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = (currentIndex + 1) % options.length;
          onChange(options[nextIndex].value);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          onChange(options[prevIndex].value);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium transition-all ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : isOpen
              ? 'border-primary ring-1 ring-primary'
              : 'border-border-grey hover:border-gray-300 hover:bg-gray-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={disabled ? 'text-gray-400' : 'text-primary'}>{selectedOption.icon}</span>
        <span className="hidden sm:inline">{selectedOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            disabled ? 'text-gray-300' : 'text-gray-400'
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border-grey bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                option.value === value
                  ? 'bg-primary/5 text-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              role="option"
              aria-selected={option.value === value}
            >
              <span
                className={`mt-0.5 ${option.value === value ? 'text-primary' : 'text-gray-400'}`}
              >
                {option.icon}
              </span>
              <div>
                <div className={`font-medium ${option.value === value ? 'text-primary' : ''}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DETAIL LEVEL DROPDOWN
// =============================================================================

interface DetailLevelDropdownProps {
  value: DetailLevel;
  options: DetailLevelOption[];
  onChange: (value: DetailLevel) => void;
  disabled: boolean;
}

function DetailLevelDropdown({ value, options, onChange, disabled }: DetailLevelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = (currentIndex + 1) % options.length;
          onChange(options[nextIndex].value);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          onChange(options[prevIndex].value);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium transition-all ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : isOpen
              ? 'border-primary ring-1 ring-primary'
              : 'border-border-grey hover:border-gray-300 hover:bg-gray-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={disabled ? 'text-gray-400' : 'text-gray-500'}>{selectedOption.icon}</span>
        <span className="hidden sm:inline">{selectedOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            disabled ? 'text-gray-300' : 'text-gray-400'
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border-grey bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                option.value === value
                  ? 'bg-primary/5 text-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              role="option"
              aria-selected={option.value === value}
            >
              <span
                className={`mt-0.5 ${option.value === value ? 'text-primary' : 'text-gray-400'}`}
              >
                {option.icon}
              </span>
              <div>
                <div className={`font-medium ${option.value === value ? 'text-primary' : ''}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


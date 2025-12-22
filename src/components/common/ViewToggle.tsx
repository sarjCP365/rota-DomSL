/**
 * ViewToggle Component
 * Consistent Day/Week/Month view toggle used across all rota views
 * Design aligned with cp365-complex-ld
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useSettingsStore, type ViewMode } from '../../store/settingsStore';

// =============================================================================
// Types
// =============================================================================

interface ViewToggleProps {
  /** Current active view */
  currentView: ViewMode;
  /** Current selected date (for navigation context) */
  currentDate?: Date;
  /** Variant for different backgrounds */
  variant?: 'light' | 'dark' | 'emerald';
  /** Size */
  size?: 'sm' | 'md';
}

// =============================================================================
// Component
// =============================================================================

export function ViewToggle({ 
  currentView, 
  currentDate = new Date(),
  variant = 'emerald',
  size = 'md',
}: ViewToggleProps) {
  const navigate = useNavigate();
  const setLastViewMode = useSettingsStore((s) => s.setLastViewMode);
  const setLastSelectedDate = useSettingsStore((s) => s.setLastSelectedDate);

  const handleViewChange = useCallback((view: ViewMode) => {
    if (view === currentView) return;
    
    // Save preferences
    setLastViewMode(view);
    setLastSelectedDate(currentDate);
    
    // Navigate to appropriate view with date context
    // For day view, default to today's date instead of the week start
    if (view === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      navigate(`/daily?date=${todayStr}`);
    } else if (view === 'week') {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      navigate(`/rota/7?date=${dateStr}`);
    } else if (view === 'month') {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      navigate(`/rota/28?date=${dateStr}`);
    }
  }, [currentView, currentDate, navigate, setLastViewMode, setLastSelectedDate]);

  // Styling based on variant
  const getStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          container: 'bg-white/20',
          active: 'bg-white text-emerald-700 shadow-sm',
          inactive: 'text-white hover:bg-white/10',
        };
      case 'dark':
        return {
          container: 'bg-slate-700',
          active: 'bg-emerald-600 text-white shadow-sm',
          inactive: 'text-slate-300 hover:bg-slate-600',
        };
      case 'light':
      default:
        return {
          container: 'bg-slate-100',
          active: 'bg-white text-emerald-600 shadow-sm border border-slate-200',
          inactive: 'text-slate-600 hover:bg-slate-200',
        };
    }
  };

  const styles = getStyles();

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-1.5 text-sm';

  const containerPadding = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <div className={`flex rounded-lg ${styles.container} ${containerPadding}`}>
      <button
        onClick={() => handleViewChange('day')}
        className={`rounded-md font-medium transition-all ${sizeClasses} ${
          currentView === 'day' ? styles.active : styles.inactive
        }`}
      >
        Day
      </button>
      <button
        onClick={() => handleViewChange('week')}
        className={`rounded-md font-medium transition-all ${sizeClasses} ${
          currentView === 'week' ? styles.active : styles.inactive
        }`}
      >
        Week
      </button>
      <button
        onClick={() => handleViewChange('month')}
        className={`rounded-md font-medium transition-all ${sizeClasses} ${
          currentView === 'month' ? styles.active : styles.inactive
        }`}
      >
        Month
      </button>
    </div>
  );
}

export default ViewToggle;


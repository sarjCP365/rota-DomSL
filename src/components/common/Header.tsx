/**
 * Header Component
 * Context header bar with emerald gradient
 * Design aligned with cp365-complex-ld ServiceUserBanner
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Menu, Bell } from 'lucide-react';
import { ReactNode } from 'react';

interface HeaderProps {
  /** Page title displayed in the header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Show back navigation button */
  showBackButton?: boolean;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Callback when refresh button is clicked */
  onRefresh?: () => void;
  /** Callback to toggle side navigation (mobile) */
  onMenuToggle?: () => void;
  /** Show the menu toggle button (for mobile) */
  showMenuToggle?: boolean;
  /** Optional right-side content */
  rightContent?: ReactNode;
  /** Use gradient style (default) or simple style */
  variant?: 'gradient' | 'simple';
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  onRefresh,
  onMenuToggle,
  showMenuToggle = true,
  rightContent,
  variant = 'gradient',
}: HeaderProps) {
  const navigate = useNavigate();

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Simple variant (white background)
  if (variant === 'simple') {
    return (
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          {showMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Back button */}
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div>
            <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              title="Refresh"
              aria-label="Refresh data"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
          {rightContent}
        </div>
      </header>
    );
  }

  // Gradient variant (emerald gradient - matching cp365-complex-ld ServiceUserBanner)
  return (
    <header className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          {showMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Back button */}
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-emerald-100">{subtitle}</p>}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors"
              title="Refresh"
              aria-label="Refresh data"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}

          {/* Notifications */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
          </button>

          {rightContent}
        </div>
      </div>
    </header>
  );
}

/**
 * PageHeader - Simpler header for page titles within content
 * Use when you need just a title without the full header bar
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

export function PageHeader({ title, subtitle, rightContent }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>
  );
}

/**
 * PageHeader Component
 * Standardised page header with menu toggle for mobile
 * Used across pages that need consistent header styling
 */

import { Header } from './Header';
import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Callback when menu button is clicked (mobile) */
  onMenuClick?: () => void;
  /** Optional right-side content */
  rightContent?: ReactNode;
  /** Header variant - defaults to 'simple' for page headers */
  variant?: 'gradient' | 'simple';
}

/**
 * PageHeader wraps the Header component with sensible defaults
 * for use as a page-level header with mobile menu support
 */
export default function PageHeader({
  title,
  subtitle,
  onMenuClick,
  rightContent,
  variant = 'simple',
}: PageHeaderProps) {
  return (
    <Header
      title={title}
      subtitle={subtitle}
      onMenuToggle={onMenuClick}
      showMenuToggle={!!onMenuClick}
      rightContent={rightContent}
      variant={variant}
    />
  );
}

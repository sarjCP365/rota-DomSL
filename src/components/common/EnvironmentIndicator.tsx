/**
 * Discrete environment indicator
 * Shows which Dataverse environment the app is connected to
 */

import { Database } from 'lucide-react';

/**
 * Extracts the environment name from the Dataverse URL
 * e.g., "https://cp365productdevelopment.crm11.dynamics.com" -> "cp365productdevelopment"
 */
function getEnvironmentName(): string {
  const url = (import.meta.env.VITE_DATAVERSE_URL as string) || '';
  try {
    const hostname = new URL(url).hostname;
    // Extract the subdomain (before .crm)
    const match = hostname.match(/^([^.]+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'not configured';
  }
}

/**
 * Determines if this is a production-like environment
 */
function isProductionEnvironment(): boolean {
  const name = getEnvironmentName().toLowerCase();
  return name.includes('prod') || name.includes('live');
}

export function EnvironmentIndicator() {
  const envName = getEnvironmentName();
  const isProd = isProductionEnvironment();

  return (
    <div className="group fixed bottom-2 right-2 z-50" role="status">
      <div
        className={`
          flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium
          transition-all duration-200 cursor-default select-none
          ${
            isProd
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }
          opacity-40 hover:opacity-70 group-hover:opacity-90
        `}
        title={`Connected to: ${import.meta.env.VITE_DATAVERSE_URL || 'Not configured'}`}
      >
        <Database className="h-3 w-3" />
        <span className="max-w-0 overflow-hidden transition-all duration-200 group-hover:max-w-[200px]">
          <span className="truncate">{envName}</span>
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-current group-hover:hidden" />
      </div>
    </div>
  );
}

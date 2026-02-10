/**
 * Attention Required Component
 * Displays prioritised alerts and issues for a date period
 */

import { AlertTriangle, AlertCircle, Moon, Sun, Clock, Calendar, Send } from 'lucide-react';
import type { AttentionItem, StaffOvertimeAlert } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/common/Loading';

interface AttentionRequiredProps {
  items: AttentionItem[];
  overtimeAlerts: StaffOvertimeAlert[];
  isLoading: boolean;
}

export function AttentionRequired({ items, overtimeAlerts, isLoading }: AttentionRequiredProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-3 p-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  // Add overtime alerts to items if present
  const allItems = [...items];
  if (overtimeAlerts.length > 0) {
    allItems.push({
      id: 'overtime',
      type: 'warning',
      category: 'overtime',
      title: `${overtimeAlerts.length} Staff Near Overtime`,
      description: 'Staff members approaching contracted hours limit',
      count: overtimeAlerts.length,
      details: overtimeAlerts.slice(0, 3).map((a) => `${a.staffName} (${a.scheduledHours}/${a.contractedHours} hrs)`),
    });
  }

  // Sort by priority: critical first, then warning, then info
  const sortedItems = allItems.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });

  const criticalCount = sortedItems.filter((i) => i.type === 'critical').length;
  const warningCount = sortedItems.filter((i) => i.type === 'warning').length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Attention Required
        </h3>
        {(criticalCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                {warningCount} warning
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <AlertCircle className="h-8 w-8" />
          <p className="mt-2 text-sm">No issues requiring attention</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sortedItems.map((item) => (
            <AttentionItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface AttentionItemCardProps {
  item: AttentionItem;
}

function AttentionItemCard({ item }: AttentionItemCardProps) {
  const config = getItemConfig(item);

  return (
    <div className={`px-4 py-3 ${config.bgClass}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-1.5 ${config.iconBgClass}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${config.titleClass}`}>{item.title}</p>
            {item.type === 'critical' && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Critical
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
          {item.details && item.details.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.details.map((detail, idx) => (
                <span
                  key={idx}
                  className={`rounded px-2 py-0.5 text-xs ${config.detailClass}`}
                >
                  {detail}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getItemConfig(item: AttentionItem) {
  const configs = {
    critical: {
      bgClass: 'bg-red-50/50',
      iconBgClass: 'bg-red-100',
      titleClass: 'text-red-800',
      detailClass: 'bg-red-100 text-red-700',
    },
    warning: {
      bgClass: 'bg-amber-50/50',
      iconBgClass: 'bg-amber-100',
      titleClass: 'text-amber-800',
      detailClass: 'bg-amber-100 text-amber-700',
    },
    info: {
      bgClass: '',
      iconBgClass: 'bg-blue-100',
      titleClass: 'text-slate-800',
      detailClass: 'bg-slate-100 text-slate-600',
    },
  };

  const icons: Record<AttentionItem['category'], React.ReactNode> = {
    'unfilled-night': <Moon className="h-4 w-4 text-red-600" />,
    'unfilled-day': <Sun className="h-4 w-4 text-amber-600" />,
    overtime: <Clock className="h-4 w-4 text-amber-600" />,
    leave: <Calendar className="h-4 w-4 text-blue-600" />,
    unpublished: <Send className="h-4 w-4 text-blue-600" />,
  };

  return {
    ...configs[item.type],
    icon: icons[item.category],
  };
}

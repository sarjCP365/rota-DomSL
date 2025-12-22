/**
 * WeekNavigator Component
 * Date navigation controls for the rota view
 */

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, addWeeks, startOfWeek } from 'date-fns';

interface WeekNavigatorProps {
  currentDate: Date;
  duration: 7 | 14 | 28;
  onDateChange: (date: Date) => void;
  onDurationChange: (duration: 7 | 14 | 28) => void;
}

export function WeekNavigator({
  currentDate,
  duration,
  onDateChange,
  onDurationChange,
}: WeekNavigatorProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, duration - 1);

  const handlePrevious = () => {
    onDateChange(addWeeks(weekStart, duration === 28 ? -4 : -1));
  };

  const handleNext = () => {
    onDateChange(addWeeks(weekStart, duration === 28 ? 4 : 1));
  };

  const handleToday = () => {
    onDateChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="flex items-center justify-between border-b border-border-grey bg-white px-4 py-3">
      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevious}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-elevation-1"
            title="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-elevation-1"
            title="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="font-medium">
            {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
          </span>
        </div>

        <button
          onClick={handleToday}
          className="rounded-lg border border-border-grey px-3 py-1 text-sm hover:bg-elevation-1"
        >
          Today
        </button>
      </div>

      {/* Duration Toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-elevation-1 p-1">
        {([7, 14, 28] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDurationChange(d)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              duration === d
                ? 'bg-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {d === 7 ? 'Weekly' : d === 14 ? '2 Weeks' : 'Monthly'}
          </button>
        ))}
      </div>
    </div>
  );
}


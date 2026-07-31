import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toPacificDateString } from '../utils/pacificDate';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Calendar day key in America/Los_Angeles (CR-83 / CR-84). */
function toDateKey(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Local calendar Date from month grid cells — use local Y-M-D, not UTC.
    if (
      value.getHours() === 0
      && value.getMinutes() === 0
      && value.getSeconds() === 0
      && value.getMilliseconds() === 0
    ) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return toPacificDateString(value);
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function PublicEventsCalendar({ events = [], selectedDate, onSelectDate, onMonthChange, monthDate }) {
  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    events.forEach((event) => {
      const key = toDateKey(event.date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    });
    return grouped;
  }, [events]);

  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);

  const monthLabel = monthDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  function shiftMonth(delta) {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
    onMonthChange(next);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const key = toDateKey(date);
          const dayEvents = eventsByDate.get(key) || [];
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition-colors ${
                isSelected
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : isToday
                    ? 'border-brand/40 bg-brand-light text-brand'
                    : dayEvents.length > 0
                      ? 'border-slate-200 bg-slate-50 text-slate-900 hover:border-brand/30 hover:bg-brand-light/40'
                      : 'border-transparent text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-semibold">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                  isSelected ? 'text-white/90' : 'text-brand'
                }`}
                >
                  {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { toDateKey };
export default PublicEventsCalendar;

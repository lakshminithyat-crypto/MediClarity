import { ClipboardList } from 'lucide-react';
import type { AnalysisResult, TestFilter } from '../types/report';
import { countTestStatuses } from '../utils/reportHelpers';

interface SummaryCardProps {
  result: AnalysisResult;
  activeFilter: TestFilter;
  onFilterChange: (filter: TestFilter) => void;
}

export function SummaryCard({ result, activeFilter, onFilterChange }: SummaryCardProps) {
  const counts = countTestStatuses(result.tests);

  return (
    <section
      aria-labelledby="summary-card-heading"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="summary-card-heading"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Report Summary
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5 tabular-nums">
              <span>{counts.total} Tests Extracted</span>
              <span aria-hidden="true">·</span>
              <span className={counts.abnormal > 0 ? 'text-amber-800 font-medium' : 'text-emerald-700 font-medium'}>
                {counts.abnormal} Outside Range
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">{counts.normal} Normal</span>
              <span aria-hidden="true">·</span>
              <span>Language: {result.language}</span>
            </div>
          </div>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div
          role="group"
          aria-label="Filter test results by status"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            aria-pressed={activeFilter === 'all'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('abnormal')}
            aria-pressed={activeFilter === 'abnormal'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeFilter === 'abnormal'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Outside Range ({counts.abnormal})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('normal')}
            aria-pressed={activeFilter === 'normal'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeFilter === 'normal'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Normal ({counts.normal})
          </button>
        </div>
      </div>

      <p
        data-testid="report-summary-text"
        className="mt-4 pt-4 border-t border-slate-100 text-[15px] sm:text-base leading-relaxed text-slate-800 max-w-4xl"
      >
        {result.summary}
      </p>
    </section>
  );
}

import type { LanguageCode } from '../types/report';

interface LoadingSkeletonProps {
  language: LanguageCode;
}

export function LoadingSkeleton({ language }: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Analyzing report in ${language}`}
      className="space-y-5"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-5 w-44 rounded bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-64 rounded bg-slate-100 animate-pulse" />
          </div>
          <span className="text-xs font-medium text-[#0284C7] whitespace-nowrap">
            Translating into {language}...
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
          <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
              <div className="h-6 w-16 rounded-md bg-slate-100 animate-pulse" />
            </div>
            <div className="h-7 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-2 w-full rounded-full bg-slate-100 animate-pulse" />
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-4/5 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

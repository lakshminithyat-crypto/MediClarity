import { ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import type { LabTestResult, TestStatus } from '../types/report';
import { parseRangePosition } from '../utils/reportHelpers';

interface TestResultCardProps {
  test: LabTestResult;
}

const STATUS_STYLES: Record<
  TestStatus,
  {
    badgeBg: string;
    cardBorder: string;
    markerColor: string;
    valueColor: string;
  }
> = {
  Normal: {
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardBorder: 'border-slate-200',
    markerColor: 'bg-emerald-600',
    valueColor: 'text-slate-900',
  },
  Low: {
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    cardBorder: 'border-amber-200/90',
    markerColor: 'bg-amber-600',
    valueColor: 'text-amber-950',
  },
  High: {
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    cardBorder: 'border-rose-200/90',
    markerColor: 'bg-rose-600',
    valueColor: 'text-rose-950',
  },
};

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === 'Low') {
    return <ArrowDownCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  if (status === 'High') {
    return <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

export function TestResultCard({ test }: TestResultCardProps) {
  const style = STATUS_STYLES[test.status];
  const gauge = parseRangePosition(test.observedValue, test.referenceRange);

  const badgeText =
    test.localizedStatus && test.localizedStatus.toLowerCase() !== test.status.toLowerCase()
      ? `${test.status} · ${test.localizedStatus}`
      : test.status;

  return (
    <article
      data-testid="test-result-card"
      data-status={test.status}
      className={`bg-white border ${style.cardBorder} rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between`}
    >
      <div>
        {/* Parameter Name & Semantic Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-slate-900 leading-snug">
            {test.parameter}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 ${style.badgeBg}`}
          >
            <StatusIcon status={test.status} />
            <span>{badgeText}</span>
          </span>
        </div>

        {/* Observed Value & Reference Range */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono tabular-nums text-2xl font-semibold tracking-tight ${style.valueColor}`}
            >
              {test.observedValue}
            </span>
            {test.unit && (
              <span className="font-mono text-xs font-medium text-slate-500">{test.unit}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            Ref: <span className="text-slate-700 font-medium">{test.referenceRange}</span>
          </p>
        </div>

        {/* Visual Reference Range Gauge */}
        {gauge && (
          <div className="mt-3.5" aria-hidden="true">
            <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-200/80 rounded-full"
                style={{
                  left: `${gauge.normalStartPercent}%`,
                  width: `${Math.max(4, gauge.normalEndPercent - gauge.normalStartPercent)}%`,
                }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-white shadow-xs ${style.markerColor}`}
                style={{ left: `${gauge.markerPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plain-language Explanation */}
      <div className="mt-4 pt-3.5 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 mb-1">What this means</p>
        <p className="text-sm leading-relaxed text-slate-700">{test.explanation}</p>
      </div>
    </article>
  );
}

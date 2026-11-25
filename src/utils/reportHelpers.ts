import type {
  AnalysisResult,
  LabTestResult,
  LanguageCode,
  TestFilter,
  TestStatus,
} from '../types/report';

export interface RangeGaugeMetrics {
  /** Normalized marker position along a 0-100 track */
  markerPercent: number;
  /** Start of the normal zone on the 0-100 track */
  normalStartPercent: number;
  /** End of the normal zone on the 0-100 track */
  normalEndPercent: number;
}

/**
 * Parses an observed numeric reading and a clinical reference range
 * (e.g. "12.0 - 15.5", "< 100", ">= 50") into normalized 0..100 coordinates
 * so the UI can display a clear, proportional visual indicator.
 */
export function parseRangePosition(
  observedValue: string,
  referenceRange: string
): RangeGaugeMetrics | null {
  const numMatch = observedValue.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!numMatch) return null;
  const value = Number.parseFloat(numMatch[0]);
  if (!Number.isFinite(value)) return null;

  const cleanedRange = referenceRange.replace(/,/g, '').trim();

  // Pattern 1: "min - max" or "min to max"
  const betweenMatch = cleanedRange.match(
    /(-?\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(-?\d+(?:\.\d+)?)/i
  );
  if (betweenMatch) {
    const low = Number.parseFloat(betweenMatch[1]);
    const high = Number.parseFloat(betweenMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
      const span = high - low;
      const trackMin = low - span * 0.6;
      const trackMax = high + span * 0.6;
      const trackSpan = trackMax - trackMin;
      const clamp = (n: number) => Math.max(4, Math.min(96, n));
      return {
        markerPercent: clamp(((value - trackMin) / trackSpan) * 100),
        normalStartPercent: ((low - trackMin) / trackSpan) * 100,
        normalEndPercent: ((high - trackMin) / trackSpan) * 100,
      };
    }
  }

  // Pattern 2: "< max" or "<= max"
  const upperMatch = cleanedRange.match(/^(?:<=?|≤|less\s+than|under)\s*(\d+(?:\.\d+)?)/i);
  if (upperMatch) {
    const max = Number.parseFloat(upperMatch[1]);
    if (Number.isFinite(max) && max > 0) {
      const trackMax = max * 1.8;
      const clamp = (n: number) => Math.max(4, Math.min(96, n));
      return {
        markerPercent: clamp((value / trackMax) * 100),
        normalStartPercent: 0,
        normalEndPercent: (max / trackMax) * 100,
      };
    }
  }

  // Pattern 3: "> min" or ">= min"
  const lowerMatch = cleanedRange.match(/^(?:>=?|≥|greater\s+than|above)\s*(\d+(?:\.\d+)?)/i);
  if (lowerMatch) {
    const min = Number.parseFloat(lowerMatch[1]);
    if (Number.isFinite(min) && min > 0) {
      const trackMax = min * 2.2;
      const clamp = (n: number) => Math.max(4, Math.min(96, n));
      return {
        markerPercent: clamp((value / trackMax) * 100),
        normalStartPercent: (min / trackMax) * 100,
        normalEndPercent: 100,
      };
    }
  }

  return null;
}

const STATUS_PRIORITY: Record<TestStatus, number> = {
  High: 0,
  Low: 1,
  Normal: 2,
};

/**
 * Filters lab tests by status category and places abnormal readings first
 * so patients immediately see items that need attention.
 */
export function sortAndFilterTests(
  tests: LabTestResult[],
  filter: TestFilter
): LabTestResult[] {
  const filtered = tests.filter((test) => {
    if (filter === 'abnormal') return test.status === 'Low' || test.status === 'High';
    if (filter === 'normal') return test.status === 'Normal';
    return true;
  });

  return [...filtered].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
}

export function countTestStatuses(tests: LabTestResult[]) {
  let normal = 0;
  let low = 0;
  let high = 0;

  for (const t of tests) {
    if (t.status === 'Normal') normal += 1;
    else if (t.status === 'Low') low += 1;
    else if (t.status === 'High') high += 1;
  }

  return {
    total: tests.length,
    normal,
    low,
    high,
    abnormal: low + high,
  };
}

/**
 * Formats the patient's doctor questions as a clean, appointment-ready note
 * suitable for pasting into Notes, WhatsApp, or printing.
 */
export function formatQuestionsForClipboard(
  questions: string[],
  checkedIndices: Set<number>,
  language: LanguageCode
): string {
  const chosen =
    checkedIndices.size > 0
      ? questions.filter((_, index) => checkedIndices.has(index))
      : questions;

  if (chosen.length === 0) return '';

  const header = `MediClarity AI — Questions for My Doctor (${language})`;
  const numbered = chosen.map((q, idx) => `${idx + 1}. ${q.trim()}`).join('\n');
  const note =
    'Note: Prepared for informational discussion with my doctor, not a medical diagnosis.';

  return `${header}\n\n${numbered}\n\n${note}`;
}

export function normalizeStatus(raw: unknown): TestStatus {
  if (typeof raw !== 'string') return 'Normal';
  const lowered = raw.trim().toLowerCase();
  if (lowered === 'low' || lowered.includes('below') || lowered.includes('low')) return 'Low';
  if (lowered === 'high' || lowered.includes('above') || lowered.includes('elevated') || lowered.includes('high')) {
    return 'High';
  }
  return 'Normal';
}

export function validateAnalysisPayload(
  raw: unknown,
  fallbackLanguage: LanguageCode,
  redactionApplied: boolean
): AnalysisResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Analysis response was empty or malformed.');
  }

  const obj = raw as Record<string, unknown>;
  const summary =
    typeof obj.summary === 'string' && obj.summary.trim().length > 0
      ? obj.summary.trim()
      : 'Your lab report has been reviewed. Please discuss the highlighted values below with your doctor.';

  const rawTests = Array.isArray(obj.tests) ? obj.tests : [];
  const tests: LabTestResult[] = rawTests
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      parameter: typeof item.parameter === 'string' && item.parameter.trim() ? item.parameter.trim() : 'Lab Parameter',
      observedValue:
        typeof item.observedValue === 'string' || typeof item.observedValue === 'number'
          ? String(item.observedValue).trim()
          : '—',
      unit: typeof item.unit === 'string' ? item.unit.trim() : '',
      referenceRange:
        typeof item.referenceRange === 'string' && item.referenceRange.trim()
          ? item.referenceRange.trim()
          : 'Not specified',
      status: normalizeStatus(item.status),
      localizedStatus:
        typeof item.localizedStatus === 'string' && item.localizedStatus.trim()
          ? item.localizedStatus.trim()
          : undefined,
      explanation:
        typeof item.explanation === 'string' && item.explanation.trim()
          ? item.explanation.trim()
          : 'Discuss this measurement with your doctor to understand what it means for you.',
    }));

  const rawQuestions = Array.isArray(obj.doctorQuestions) ? obj.doctorQuestions : [];
  const doctorQuestions = rawQuestions
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    .map((q) => q.trim())
    .slice(0, 5);

  if (tests.length === 0) {
    throw new Error('No lab test parameters could be extracted from this report.');
  }

  return {
    language: fallbackLanguage,
    summary,
    tests,
    doctorQuestions,
    redactionApplied,
  };
}

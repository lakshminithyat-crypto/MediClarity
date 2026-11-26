/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Languages, RefreshCw, ShieldCheck, ClipboardCheck, FileText } from 'lucide-react';
import { Header } from './components/Header';
import { SafetyBanner } from './components/SafetyBanner';
import { ReportInputPanel } from './components/ReportInputPanel';
import { SummaryCard } from './components/SummaryCard';
import { TestResultCard } from './components/TestResultCard';
import { DoctorQuestionsCard } from './components/DoctorQuestionsCard';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import type { AnalysisResult, LanguageCode, LoadedReport, TestFilter } from './types/report';
import { sortAndFilterTests } from './utils/reportHelpers';
import { analyzeReportClientSide } from './services/geminiAnalysis';

interface PendingAnalyzePayload {
  text?: string;
  file?: { mimeType: string; data: string };
  redactionApplied: boolean;
}

export default function App() {
  const [language, setLanguage] = useState<LanguageCode>('English');
  const [autoRedact, setAutoRedact] = useState<boolean>(true);
  const [report, setReport] = useState<LoadedReport | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TestFilter>('all');
  const lastPayloadRef = useRef<PendingAnalyzePayload | null>(null);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  const handleFileSelected = useCallback((loaded: LoadedReport) => {
    setErrorMessage(null);
    setResult(null);
    setActiveFilter('all');
    setReport(loaded);
  }, []);

  const handleClearReport = useCallback(() => {
    setReport(null);
    setResult(null);
    setErrorMessage(null);
    setActiveFilter('all');
    lastPayloadRef.current = null;
  }, []);

  const runAnalysis = useCallback(
    async (payload: PendingAnalyzePayload, targetLanguage: LanguageCode) => {
      lastPayloadRef.current = payload;
      setIsAnalyzing(true);
      setErrorMessage(null);

      try {
        const validated = await analyzeReportClientSide({
          language: targetLanguage,
          text: payload.text,
          file: payload.file,
          redactionApplied: payload.redactionApplied,
        });

        setResult(validated);
        setActiveFilter('all');

        // Smooth scroll to results on compact screens
        if (window.innerWidth < 1024) {
          window.requestAnimationFrame(() => {
            resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to complete the report analysis. Please try again.';
        setErrorMessage(msg);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const handleAnalyze = useCallback(
    (payload: PendingAnalyzePayload) => {
      void runAnalysis(payload, language);
    },
    [language, runAnalysis]
  );

  const handleRetranslate = useCallback(() => {
    if (lastPayloadRef.current) {
      void runAnalysis(lastPayloadRef.current, language);
    }
  }, [language, runAnalysis]);

  const displayedTests = useMemo(() => {
    if (!result) return [];
    return sortAndFilterTests(result.tests, activeFilter);
  }, [result, activeFilter]);

  const showLanguageMismatchBanner =
    Boolean(result) && !isAnalyzing && result?.language !== language && Boolean(lastPayloadRef.current);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50/40 text-slate-900">
      <Header language={language} onLanguageChange={setLanguage} />
      <SafetyBanner />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {/* Intro Heading */}
        <div className="mb-7 max-w-3xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Understand your medical lab report in plain language
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Upload a blood test image (JPG/PNG) or PDF report to see clear, non-diagnostic
            explanations and tailored questions for your next doctor visit — in English, Telugu,
            Hindi, or Tamil.
          </p>
        </div>

        {/* Main 2-Column Clinical Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          {/* Left Column: Report Input & Privacy Controls */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <ReportInputPanel
              report={report}
              autoRedact={autoRedact}
              onAutoRedactChange={setAutoRedact}
              onFileSelected={handleFileSelected}
              onClearReport={handleClearReport}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              language={language}
              hasExistingResult={Boolean(result)}
              resultLanguage={result?.language}
            />
          </div>

          {/* Right Column: Results Dashboard */}
          <div ref={resultsTopRef} className="lg:col-span-7 space-y-5">
            {/* Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-3.5"
              >
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-sm font-semibold text-rose-950">
                    Analysis Could Not Be Completed
                  </h2>
                  <p className="text-sm text-rose-800 mt-1 leading-relaxed">{errorMessage}</p>
                  {lastPayloadRef.current && (
                    <button
                      type="button"
                      onClick={handleRetranslate}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-rose-300 text-xs font-semibold text-rose-800 hover:bg-rose-100/60 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Try Again</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing && <LoadingSkeleton language={language} />}

            {/* Empty State */}
            {!isAnalyzing && !result && !errorMessage && (
              <section
                aria-label="How MediClarity AI works"
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Your Interpretation Dashboard
                </h2>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {report
                    ? 'Your report is loaded and ready. Click "Analyze Report" to generate your plain-language breakdown and doctor checklist.'
                    : 'Upload your medical lab report image (JPG/PNG) or PDF on the left to see a complete plain-language walkthrough here.'}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center mb-3">
                      <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      1. Local Privacy Masking
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Patient names and phone numbers are masked directly in your browser before
                      analysis.
                    </p>
                  </div>

                  <div>
                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      2. Color-Coded Clarity
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Every marker is clearly labeled Normal, Low, or High with an easy 8th-grade
                      explanation.
                    </p>
                  </div>

                  <div>
                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center mb-3">
                      <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      3. Doctor Visit Checklist
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Get 3–4 focused follow-up questions tailored to your numbers, ready to copy in
                      one click.
                    </p>
                  </div>
                </div>

                {/* Quick Reading Key */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Status Guide:</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                      <span className="w-2 h-2 rounded-xs bg-emerald-500" aria-hidden="true" />
                      Normal — Within lab reference range
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                      <span className="w-2 h-2 rounded-xs bg-amber-500" aria-hidden="true" />
                      Low — Below typical range
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-800">
                      <span className="w-2 h-2 rounded-xs bg-rose-500" aria-hidden="true" />
                      High — Above typical range
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Populated Results Dashboard */}
            {!isAnalyzing && result && (
              <div className="space-y-5" data-testid="results-dashboard">
                {/* Language Switch Prompt */}
                {showLanguageMismatchBanner && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-sky-950">
                      <Languages className="w-4 h-4 text-[#0284C7] shrink-0" aria-hidden="true" />
                      <span>
                        Language changed to <strong>{language}</strong>. Translate this report
                        summary and questions?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetranslate}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Translate to {language}
                    </button>
                  </div>
                )}

                {/* Summary Card */}
                <SummaryCard
                  result={result}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />

                {/* Color-Coded Test Parameter Cards */}
                <section aria-labelledby="test-results-heading">
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      id="test-results-heading"
                      className="font-display text-base font-semibold text-slate-900"
                    >
                      Lab Test Breakdown
                    </h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      Showing {displayedTests.length} of {result.tests.length} parameters
                    </span>
                  </div>

                  {displayedTests.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-600">
                      No tests match the selected filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedTests.map((item, idx) => (
                        <TestResultCard key={`${item.parameter}-${idx}`} test={item} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Questions for Your Doctor Card */}
                {result.doctorQuestions.length > 0 && (
                  <DoctorQuestionsCard
                    questions={result.doctorQuestions}
                    language={result.language}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>MediClarity AI — Patient-friendly lab report interpretation.</p>
          <p>Informational use only · Not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  FileText,
  FileUp,
  Lock,
  ScanSearch,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import type { LanguageCode, LoadedReport } from '../types/report';
import {
  applyClientSideImageRedaction,
  DEFAULT_HEADER_MASK_PERCENT,
} from '../utils/canvasRedaction';

interface ReportInputPanelProps {
  report: LoadedReport | null;
  autoRedact: boolean;
  onAutoRedactChange: (next: boolean) => void;
  onFileSelected: (report: LoadedReport) => void;
  onClearReport: () => void;
  onAnalyze: (payload: {
    text?: string;
    file?: { mimeType: string; data: string };
    redactionApplied: boolean;
  }) => void;
  isAnalyzing: boolean;
  language: LanguageCode;
  hasExistingResult: boolean;
  resultLanguage?: LanguageCode;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ReportInputPanel({
  report,
  autoRedact,
  onAutoRedactChange,
  onFileSelected,
  onClearReport,
  onAnalyze,
  isAnalyzing,
  language,
  hasExistingResult,
  resultLanguage,
}: ReportInputPanelProps) {
  const fileInputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [headerMaskPercent, setHeaderMaskPercent] = useState(DEFAULT_HEADER_MASK_PERCENT);
  const [redactedImageState, setRedactedImageState] = useState<{
    dataUrl: string;
    base64Data: string;
    mimeType: string;
  } | null>(null);
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (report?.kind !== 'image' || !report.dataUrl) {
      setRedactedImageState(null);
      return;
    }

    if (!autoRedact) {
      setRedactedImageState({
        dataUrl: report.dataUrl,
        base64Data: report.base64Data ?? '',
        mimeType: report.mimeType,
      });
      return;
    }

    applyClientSideImageRedaction(report.dataUrl, {
      redactHeader: true,
      headerMaskPercent,
    })
      .then((res) => {
        if (!cancelled) {
          setRedactedImageState(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRedactedImageState(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [report, autoRedact, headerMaskPercent]);

  const processFile = useCallback(
    (file: File) => {
      setUploadError(null);
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, or PDF medical report.');
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError('File is larger than 10 MB. Please upload a smaller report file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64Data = result.includes(',') ? result.split(',')[1] : '';
        if (!base64Data) {
          setUploadError('Could not read the selected file. Please try another file.');
          return;
        }
        setShowOriginalImage(false);
        onFileSelected({
          kind: file.type === 'application/pdf' ? 'pdf' : 'image',
          fileName: file.name,
          mimeType: file.type,
          dataUrl: file.type === 'application/pdf' ? undefined : result,
          base64Data,
          fileSizeBytes: file.size,
        });
      };
      reader.onerror = () => {
        setUploadError('Could not read the selected file. Please try again.');
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleAnalyzeClick = () => {
    if (!report) return;

    if (report.kind === 'image') {
      const target = autoRedact && redactedImageState ? redactedImageState : null;
      const mimeType = target ? target.mimeType : report.mimeType;
      const data = target ? target.base64Data : report.base64Data ?? '';
      onAnalyze({
        file: { mimeType, data },
        redactionApplied: autoRedact,
      });
      return;
    }

    if (report.kind === 'pdf' && report.base64Data) {
      onAnalyze({
        file: { mimeType: report.mimeType, data: report.base64Data },
        redactionApplied: autoRedact,
      });
    }
  };

  const needsReanalysisForLanguage =
    hasExistingResult && resultLanguage && resultLanguage !== language;

  return (
    <section
      aria-labelledby="upload-section-heading"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="pb-4 border-b border-slate-100">
        <h2
          id="upload-section-heading"
          className="font-display text-lg font-semibold text-slate-900"
        >
          Upload Lab Report
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload your blood test image (JPG/PNG) or PDF report for plain-language interpretation.
        </p>
      </div>

      {/* Upload Dropzone or Loaded Report Preview */}
      <div className="mt-5">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Upload medical lab report image or PDF"
        />

        {!report ? (
          <label
            htmlFor={fileInputId}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#0284C7] bg-sky-50/70'
                : 'border-slate-300 bg-slate-50/50 hover:border-sky-400 hover:bg-sky-50/40'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-sky-100/80 text-[#0284C7] flex items-center justify-center mx-auto mb-3">
              <FileUp className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-display text-base font-semibold text-slate-900">
              Drop your medical report here, or browse files
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Supports JPG, PNG, and PDF lab reports up to 10 MB
            </p>
            <span className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 shadow-2xs">
              Choose File
            </span>
          </label>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            {/* Loaded file bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#0284C7] shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {report.fileName}
                </span>
                {report.fileSizeBytes ? (
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    · {formatFileSize(report.fileSizeBytes)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="text-xs font-medium text-[#0284C7] hover:text-[#0369A1] px-2.5 py-1.5 rounded-md hover:bg-sky-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onClearReport}
                  disabled={isAnalyzing}
                  aria-label="Remove loaded report"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-rose-700 px-2.5 py-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Preview area by input type */}

            {report.kind === 'image' && (
              <div className="p-4 space-y-3">
                {autoRedact && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <label htmlFor="header-mask-slider" className="font-medium text-slate-700">
                      Header Privacy Mask: <span className="font-mono tabular-nums">{headerMaskPercent}%</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="header-mask-slider"
                        type="range"
                        min={0}
                        max={35}
                        value={headerMaskPercent}
                        onChange={(e) => setHeaderMaskPercent(Number(e.target.value))}
                        className="w-28 accent-[#0284C7] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOriginalImage((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer whitespace-nowrap"
                      >
                        {showOriginalImage ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View Redacted</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Compare Original</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center max-h-72">
                  <img
                    src={
                      showOriginalImage || !autoRedact
                        ? report.dataUrl
                        : redactedImageState?.dataUrl ?? report.dataUrl
                    }
                    alt={
                      autoRedact && !showOriginalImage
                        ? 'Uploaded medical lab report with patient header redacted locally'
                        : 'Uploaded medical lab report preview'
                    }
                    className="max-h-72 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            {report.kind === 'pdf' && (
              <div className="p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-sky-100 text-[#0284C7] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">PDF Lab Report Ready for Analysis</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    {autoRedact
                      ? 'The AI engine is instructed to extract only clinical measurements and ignore patient names, phone numbers, and IDs. For visual black-bar header masking, upload a JPG or PNG screenshot.'
                      : 'Ready to send for multilingual plain-language interpretation.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
            {uploadError}
          </p>
        )}
      </div>

      {/* Privacy Toggle Switch */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#0284C7] shrink-0 mt-1" aria-hidden="true" />
          <div>
            <label
              htmlFor="auto-redact-switch"
              className="text-sm font-semibold text-slate-900 cursor-pointer block"
            >
              Auto-Hide Patient Name &amp; Phone Before AI Analysis
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Masks personal details locally in your browser before transmitting lab numbers.
            </p>
          </div>
        </div>

        <button
          id="auto-redact-switch"
          type="button"
          role="switch"
          aria-checked={autoRedact}
          aria-label="Auto-Hide Patient Name & Phone Before AI Analysis"
          onClick={() => onAutoRedactChange(!autoRedact)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 ${
            autoRedact ? 'bg-[#0284C7]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
              autoRedact ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Primary Analyze Action */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleAnalyzeClick}
          disabled={!report || isAnalyzing}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm sm:text-base font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:bg-slate-300 disabled:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed min-h-[46px] shadow-xs"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Analyzing Report in {language}...</span>
            </>
          ) : needsReanalysisForLanguage ? (
            <>
              <ScanSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Re-Analyze Report in {language}</span>
            </>
          ) : (
            <>
              <ScanSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Analyze Report</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}

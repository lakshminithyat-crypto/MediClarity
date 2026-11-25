export type LanguageCode = 'English' | 'Telugu' | 'Hindi' | 'Tamil';

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}> = [
  { code: 'English', label: 'English', nativeLabel: 'English' },
  { code: 'Telugu', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'Hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'Tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
];

export type TestStatus = 'Normal' | 'Low' | 'High';

export interface LabTestResult {
  parameter: string;
  observedValue: string;
  unit: string;
  referenceRange: string;
  status: TestStatus;
  localizedStatus?: string;
  explanation: string;
}

export interface AnalysisResult {
  language: LanguageCode;
  summary: string;
  tests: LabTestResult[];
  doctorQuestions: string[];
  redactionApplied: boolean;
}

export interface RedactionResult {
  redactedText: string;
  redactedCount: number;
  redactedCategories: string[];
}

export type ReportInputKind = 'image' | 'pdf';

export interface LoadedReport {
  kind: ReportInputKind;
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  base64Data?: string;
  fileSizeBytes?: number;
}

export type TestFilter = 'all' | 'abnormal' | 'normal';

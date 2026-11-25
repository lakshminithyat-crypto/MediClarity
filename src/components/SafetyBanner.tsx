import { AlertCircle } from 'lucide-react';

export function SafetyBanner() {
  return (
    <div
      role="note"
      aria-label="Medical safety disclaimer"
      className="bg-amber-50/90 border-b border-amber-200/80 text-amber-950"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-start sm:items-center gap-2.5 text-xs sm:text-sm leading-snug">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        <p className="font-medium">
          Disclaimer: For informational purposes only. This tool does not provide medical diagnoses.
          Always consult a qualified doctor.
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Check, Copy, Stethoscope } from 'lucide-react';
import type { LanguageCode } from '../types/report';
import { formatQuestionsForClipboard } from '../utils/reportHelpers';

interface DoctorQuestionsCardProps {
  questions: string[];
  language: LanguageCode;
}

export function DoctorQuestionsCard({ questions, language }: DoctorQuestionsCardProps) {
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  // Reset checklist when a new analysis arrives
  useEffect(() => {
    setCheckedIndices(new Set());
    setCopied(false);
  }, [questions, language]);

  const toggleQuestion = (index: number) => {
    setCheckedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    const formatted = formatQuestionsForClipboard(questions, checkedIndices, language);
    if (!formatted) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy method if clipboard API is restricted inside iframe
      const textarea = document.createElement('textarea');
      textarea.value = formatted;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <section
      aria-labelledby="doctor-questions-heading"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="doctor-questions-heading"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Questions for Your Doctor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {checkedIndices.size > 0
                ? `${checkedIndices.size} selected — copy your priority checklist for your visit.`
                : 'Check priority items or copy the full checklist to bring to your appointment.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={questions.length === 0}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px] ${
            copied
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Copied Questions</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {checkedIndices.size > 0
                  ? `Copy Selected (${checkedIndices.size})`
                  : 'Copy Questions'}
              </span>
            </>
          )}
        </button>
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {questions.map((question, index) => {
          const isChecked = checkedIndices.has(index);
          const checkboxId = `doctor-question-${index}`;
          return (
            <li key={index} className="py-3 first:pt-1 last:pb-0">
              <label
                htmlFor={checkboxId}
                className="flex items-start gap-3 cursor-pointer group min-h-[36px]"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleQuestion(index)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7] cursor-pointer shrink-0"
                />
                <span
                  className={`text-sm sm:text-[15px] leading-relaxed transition-colors ${
                    isChecked ? 'text-slate-900 font-medium' : 'text-slate-700 group-hover:text-slate-900'
                  }`}
                >
                  {question}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import type { RedactionResult } from '../types/report';

interface RedactionRule {
  category: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
}

const PII_RULES: RedactionRule[] = [
  {
    category: 'Patient Name',
    pattern: /^(\s*(?:Patient\s+Name|Patient|Full\s+Name|Name)\s*[:\-]\s*)(.+)$/gim,
    replacement: '$1[REDACTED NAME]',
  },
  {
    category: 'Phone Number',
    pattern:
      /(?:(\b(?:Phone|Mobile|Contact|Tel|Telephone|Cell)\s*[:\-]\s*)(?:\+?\d[\d\s().\-]{7,18}\d)|(?<!\d)(?:\+\d{1,3}[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}|\d{5}[\s.\-]?\d{5})(?!\d))/gi,
    replacement: (_match: string, label?: string) =>
      label ? `${label}[REDACTED PHONE]` : '[REDACTED PHONE]',
  },
  {
    category: 'Email Address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: '[REDACTED EMAIL]',
  },
  {
    category: 'Patient ID',
    pattern: /^(\s*(?:Patient\s+ID|MRN|UHID|Lab\s+ID|Registration\s+No\.?)\s*[:\-]\s*)(.+)$/gim,
    replacement: '$1[REDACTED ID]',
  },
  {
    category: 'Address',
    pattern: /^(\s*(?:Address|Home\s+Address|Residence)\s*[:\-]\s*)(.+)$/gim,
    replacement: '$1[REDACTED ADDRESS]',
  },
  {
    category: 'Date of Birth',
    pattern: /^(\s*(?:DOB|Date\s+of\s+Birth|Birth\s+Date)\s*[:\-]\s*)(.+)$/gim,
    replacement: '$1[REDACTED DOB]',
  },
];

/**
 * Redacts personal identifiers (patient name, phone, email, ID, address, DOB)
 * locally in the browser before any report text is transmitted for AI analysis.
 */
export function redactPatientPii(input: string): RedactionResult {
  if (!input) {
    return { redactedText: '', redactedCount: 0, redactedCategories: [] };
  }

  let output = input;
  let totalCount = 0;
  const categoriesSet = new Set<string>();

  for (const rule of PII_RULES) {
    let ruleMatches = 0;
    output = output.replace(rule.pattern, (...args: unknown[]) => {
      const fullMatch = String(args[0]);
      // Skip already redacted tokens to keep redaction idempotent
      if (fullMatch.includes('[REDACTED')) {
        return fullMatch;
      }
      ruleMatches += 1;
      if (typeof rule.replacement === 'function') {
        const groups = args.slice(1, -2).map((g) => (typeof g === 'string' ? g : ''));
        return rule.replacement(fullMatch, ...groups);
      }
      // Support $1 capture group replacement cleanly
      const firstGroup = typeof args[1] === 'string' ? args[1] : '';
      return rule.replacement.replace('$1', firstGroup);
    });

    if (ruleMatches > 0) {
      totalCount += ruleMatches;
      categoriesSet.add(rule.category);
    }
  }

  return {
    redactedText: output,
    redactedCount: totalCount,
    redactedCategories: Array.from(categoriesSet),
  };
}

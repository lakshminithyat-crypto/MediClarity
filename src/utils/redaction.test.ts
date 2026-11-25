import test from 'node:test';
import assert from 'node:assert/strict';
import { redactPatientPii } from './redaction';
import { SAMPLE_BLOOD_REPORT_TEXT } from './sampleReport';

test('redactPatientPii hides patient name, phone, email, ID, and DOB while keeping lab values intact', () => {
  const result = redactPatientPii(SAMPLE_BLOOD_REPORT_TEXT);

  assert.equal(result.redactedText.includes('Priya Sharma'), false);
  assert.equal(result.redactedText.includes('98401 22749'), false);
  assert.equal(result.redactedText.includes('priya.sharma@example.com'), false);
  assert.equal(result.redactedText.includes('MC-482910'), false);
  assert.equal(result.redactedText.includes('14-05-1992'), false);

  assert.equal(result.redactedText.includes('[REDACTED NAME]'), true);
  assert.equal(result.redactedText.includes('[REDACTED PHONE]'), true);

  // Ensure clinical measurements are never corrupted by phone/ID regexes
  assert.equal(result.redactedText.includes('10.4 g/dL'), true);
  assert.equal(result.redactedText.includes('168 mg/dL'), true);
  assert.equal(result.redactedText.includes('92 mg/dL'), true);
  assert.equal(result.redactedText.includes('12.0 - 15.5 g/dL'), true);

  assert.ok(result.redactedCount >= 5);
  assert.ok(result.redactedCategories.includes('Patient Name'));
  assert.ok(result.redactedCategories.includes('Phone Number'));
});

test('redactPatientPii is idempotent on already redacted text', () => {
  const first = redactPatientPii(SAMPLE_BLOOD_REPORT_TEXT);
  const second = redactPatientPii(first.redactedText);

  assert.equal(second.redactedText, first.redactedText);
  assert.equal(second.redactedCount, 0);
});

test('redactPatientPii handles US phone formats without touching lab ranges', () => {
  const text = `Patient: Jordan Lee\nContact: (415) 555-0192\nGlucose: 95 mg/dL (70 - 99)`;
  const result = redactPatientPii(text);

  assert.equal(result.redactedText.includes('Jordan Lee'), false);
  assert.equal(result.redactedText.includes('555-0192'), false);
  assert.equal(result.redactedText.includes('Glucose: 95 mg/dL (70 - 99)'), true);
});

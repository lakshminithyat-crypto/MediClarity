import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countTestStatuses,
  formatQuestionsForClipboard,
  parseRangePosition,
  sortAndFilterTests,
  validateAnalysisPayload,
} from './reportHelpers';
import type { LabTestResult } from '../types/report';

const SAMPLE_TESTS: LabTestResult[] = [
  {
    parameter: 'Fasting Blood Glucose',
    observedValue: '92',
    unit: 'mg/dL',
    referenceRange: '70 - 99 mg/dL',
    status: 'Normal',
    explanation: 'Your blood sugar is right in the healthy fasting range.',
  },
  {
    parameter: 'Hemoglobin',
    observedValue: '10.4',
    unit: 'g/dL',
    referenceRange: '12.0 - 15.5 g/dL',
    status: 'Low',
    explanation: 'Hemoglobin carries oxygen in your blood and is slightly below the usual range.',
  },
  {
    parameter: 'LDL Cholesterol',
    observedValue: '168',
    unit: 'mg/dL',
    referenceRange: '< 100 mg/dL',
    status: 'High',
    explanation: 'LDL cholesterol is above the recommended target.',
  },
];

test('parseRangePosition computes bounded marker positions for interval, upper, and lower ranges', () => {
  const lowHb = parseRangePosition('10.4', '12.0 - 15.5 g/dL');
  assert.ok(lowHb);
  assert.ok(lowHb.markerPercent < lowHb.normalStartPercent);

  const normalGlucose = parseRangePosition('92', '70 - 99 mg/dL');
  assert.ok(normalGlucose);
  assert.ok(
    normalGlucose.markerPercent >= normalGlucose.normalStartPercent &&
      normalGlucose.markerPercent <= normalGlucose.normalEndPercent
  );

  const highLdl = parseRangePosition('168', '< 100 mg/dL');
  assert.ok(highLdl);
  assert.ok(highLdl.markerPercent > highLdl.normalEndPercent);

  const normalHdl = parseRangePosition('54', '>= 50 mg/dL');
  assert.ok(normalHdl);
  assert.ok(normalHdl.markerPercent >= normalHdl.normalStartPercent);
});

test('sortAndFilterTests prioritizes abnormal values and filters accurately', () => {
  const all = sortAndFilterTests(SAMPLE_TESTS, 'all');
  assert.equal(all[0].status, 'High');
  assert.equal(all[1].status, 'Low');
  assert.equal(all[2].status, 'Normal');

  const abnormal = sortAndFilterTests(SAMPLE_TESTS, 'abnormal');
  assert.equal(abnormal.length, 2);

  const normal = sortAndFilterTests(SAMPLE_TESTS, 'normal');
  assert.equal(normal.length, 1);
  assert.equal(normal[0].parameter, 'Fasting Blood Glucose');
});

test('countTestStatuses tallies normal, low, high, and abnormal counts', () => {
  const counts = countTestStatuses(SAMPLE_TESTS);
  assert.deepEqual(counts, {
    total: 3,
    normal: 1,
    low: 1,
    high: 1,
    abnormal: 2,
  });
});

test('formatQuestionsForClipboard formats either checked questions or all questions', () => {
  const questions = ['Question A?', 'Question B?', 'Question C?'];

  const allText = formatQuestionsForClipboard(questions, new Set(), 'English');
  assert.equal(allText.includes('1. Question A?'), true);
  assert.equal(allText.includes('3. Question C?'), true);

  const checkedText = formatQuestionsForClipboard(questions, new Set([1]), 'Telugu');
  assert.equal(checkedText.includes('1. Question B?'), true);
  assert.equal(checkedText.includes('Question A?'), false);
  assert.equal(checkedText.includes('(Telugu)'), true);
});

test('validateAnalysisPayload normalizes valid payloads and rejects empty test arrays', () => {
  const valid = validateAnalysisPayload(
    {
      summary: 'Two values need attention.',
      tests: [
        {
          parameter: 'Hemoglobin',
          observedValue: '10.4',
          unit: 'g/dL',
          referenceRange: '12.0 - 15.5 g/dL',
          status: 'low',
          explanation: 'Below standard range.',
        },
      ],
      doctorQuestions: ['Should I check my iron levels?'],
    },
    'Hindi',
    true
  );

  assert.equal(valid.language, 'Hindi');
  assert.equal(valid.tests[0].status, 'Low');
  assert.equal(valid.redactionApplied, true);

  assert.throws(() =>
    validateAnalysisPayload({ summary: 'Empty', tests: [], doctorQuestions: [] }, 'English', true)
  );
});

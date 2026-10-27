import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runOcrEvaluation, EVALUATION_DATASET } from '../../src/features/personalExpense/ocr/ocrEvaluationTool.js';

test('OCR Accuracy Evaluation: Evaluates labelled dataset across Tesseract, OXR, and Reconciler', () => {
  const report = runOcrEvaluation(EVALUATION_DATASET);

  assert.equal(report.totalDocuments, 9);

  // Both engines and reconciled should achieve high total amount accuracy on this labelled set
  assert.equal(report.accuracy.totalAmount.tesseract, '100.0%');
  assert.equal(report.accuracy.totalAmount.oxr, '100.0%');
  assert.equal(report.accuracy.totalAmount.reconciled, '100.0%');

  // Date accuracy
  assert.equal(report.accuracy.receiptDate.tesseract, '100.0%');
  assert.equal(report.accuracy.receiptDate.oxr, '100.0%');

  // Completeness
  assert.ok(parseFloat(report.fieldCompleteness.reconciled) >= 90);

  // Check categories exist
  assert.ok(report.perCategory['Grocery & Supermarket']);
  assert.ok(report.perCategory['Electrical & Construction']);
  assert.ok(report.perCategory['Utility & Electricity Bills']);
  assert.ok(report.perCategory['Restaurant & Dining']);
  assert.ok(report.perCategory['UPI & Payment Screenshots']);
  assert.ok(report.perCategory['Multilingual Regional']);

  // Detailed reports per document
  assert.equal(report.itemReports.length, 9);
  for (const item of report.itemReports) {
    assert.equal(item.reconciled.match, true, `Item ${item.id} should match expected values`);
  }
});

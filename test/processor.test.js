const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCardCsv } = require('../src/csvRows');
const { QuickBooksPaymentsClient } = require('../src/quickbooksPayments');
const { processRow } = require('../src/processor');
const { getQuickBooksConfig } = require('../src/config');
const { redact } = require('../src/logger');

test('dry-run processor returns safe result fields only', async () => {
  const [row] = parseCardCsv(Buffer.from('4111111111111111,123,12/30,,,94105\n'));
  const client = new QuickBooksPaymentsClient(getQuickBooksConfig({ dryRun: true }));
  const result = await processRow(row, client);

  assert.equal(result.lastFour, '1111');
  assert.equal(result.processorStatus, 'AUTHORIZED');
  assert.equal(result.authorizationReleased, true);
  assert.equal(result.errorMessage, '');
  assert.equal(Object.hasOwn(result, 'cardNumber'), false);
  assert.equal(Object.hasOwn(result, 'cvv'), false);
});

test('redact removes card numbers and tokens from structured logs', () => {
  const redacted = redact({
    authorization: 'Bearer abc123',
    nested: {
      message: 'card 4111 1111 1111 1111 failed',
      cvv: '123'
    }
  });

  assert.equal(redacted.authorization, '[REDACTED]');
  assert.equal(redacted.nested.message, 'card [REDACTED_CARD] failed');
  assert.equal(redacted.nested.cvv, '[REDACTED]');
});

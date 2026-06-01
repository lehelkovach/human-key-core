const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCardCsv } = require('../src/csvRows');
const { parseExpiration } = require('../src/cards');

test('parseCardCsv maps cells by position and treats values as text', () => {
  const rows = parseCardCsv(Buffer.from('0011223344556677,012,03/30,reserved,a,00501\n'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].cardNumber, '0011223344556677');
  assert.equal(rows[0].cvv, '012');
  assert.equal(rows[0].expirationText, '03/30');
  assert.equal(rows[0].zip, '00501');
  assert.equal(rows[0].lastFour, '6677');
});

test('parseExpiration warns on ambiguous mm/ds-like text instead of enforcing it', () => {
  const parsed = parseExpiration('02/ds');

  assert.equal(parsed.normalized, '02/ds');
  assert.match(parsed.warning, /mm\/ds/);
});

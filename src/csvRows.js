const { parse } = require('csv-parse/sync');
const { lastFour, parseExpiration } = require('./cards');

function parseCardCsv(buffer) {
  const records = parse(buffer, {
    bom: true,
    cast: false,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false
  });

  return records
    .map((record, index) => {
      const cells = Array.from({ length: Math.max(record.length, 6) }, (_, cellIndex) =>
        record[cellIndex] == null ? '' : String(record[cellIndex])
      );
      const expiration = parseExpiration(cells[2]);

      return {
        rowNumber: index + 1,
        cardNumber: cells[0].trim(),
        cvv: cells[1].trim(),
        expirationText: cells[2].trim(),
        reserved4: cells[3],
        reserved5: cells[4],
        zip: cells[5].trim(),
        lastFour: lastFour(cells[0]),
        expirationNormalized: expiration.normalized,
        expirationWarning: expiration.warning || ''
      };
    })
    .filter((row) => row.cardNumber || row.cvv || row.expirationText || row.zip);
}

module.exports = {
  parseCardCsv
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function lastFour(cardNumber) {
  const digits = digitsOnly(cardNumber);
  return digits.length >= 4 ? digits.slice(-4) : '';
}

function parseExpiration(expirationText) {
  const raw = String(expirationText || '').trim();
  const match = raw.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);

  if (!match) {
    return {
      raw,
      normalized: raw,
      warning: 'Expiration format was not enforced because "mm/ds" is ambiguous; mm/yy or mm/yyyy is expected for live calls.'
    };
  }

  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return {
      raw,
      normalized: raw,
      warning: 'Expiration month must be between 01 and 12.'
    };
  }

  const yearText = match[2];
  const fullYear = yearText.length === 2 ? Number(`20${yearText}`) : Number(yearText);

  return {
    raw,
    month: String(month).padStart(2, '0'),
    year: String(fullYear),
    normalized: `${String(month).padStart(2, '0')}/${String(fullYear).slice(-2)}`
  };
}

function requireLiveExpiration(expirationText) {
  const parsed = parseExpiration(expirationText);
  if (!parsed.month || !parsed.year) {
    throw new Error(parsed.warning || 'Expiration date must be mm/yy or mm/yyyy for live QuickBooks calls.');
  }
  return parsed;
}

module.exports = {
  digitsOnly,
  lastFour,
  parseExpiration,
  requireLiveExpiration
};

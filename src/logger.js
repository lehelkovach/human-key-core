const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const SENSITIVE_KEY_PATTERN = /(authorization|access.?token|refresh.?token|client.?secret|secret|password|cvv|cvc|card.?number|private.?key|ssh.?key|api.?key)/i;
const CARD_NUMBER_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;

function configuredLevel() {
  return (process.env.LOG_LEVEL || 'info').toLowerCase();
}

function shouldLog(level) {
  const threshold = LEVELS[configuredLevel()] || LEVELS.info;
  return (LEVELS[level] || LEVELS.info) >= threshold;
}

function redactString(value) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(CARD_NUMBER_PATTERN, '[REDACTED_CARD]');
}

function redact(value, key = '') {
  if (value == null) {
    return value;
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)])
    );
  }

  return value;
}

function createLogger(component) {
  function write(level, message, meta = {}) {
    if (!shouldLog(level)) {
      return;
    }

    const payload = {
      time: new Date().toISOString(),
      level,
      component,
      message,
      ...redact(meta)
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta)
  };
}

module.exports = {
  createLogger,
  redact
};

const { createLogger } = require('./logger');

const logger = createLogger('processor');

async function processRows(rows, paymentsClient, onProgress = () => {}) {
  const results = [];

  for (const row of rows) {
    const result = await processRow(row, paymentsClient);
    results.push(result);
    onProgress(result, results.length);
  }

  return results;
}

async function processRow(row, paymentsClient) {
  const startedAt = new Date().toISOString();
  const base = {
    rowNumber: row.rowNumber,
    lastFour: row.lastFour,
    expirationDate: row.expirationNormalized || row.expirationText,
    processorStatus: 'not_started',
    processorStatusCode: '',
    declineReason: '',
    errorMessage: '',
    expirationWarning: row.expirationWarning || '',
    dryRun: Boolean(paymentsClient.config && paymentsClient.config.dryRun),
    startedAt
  };

  try {
    validateRow(row);
    logger.info('Processing row', {
      rowNumber: row.rowNumber,
      lastFour: row.lastFour,
      dryRun: base.dryRun
    });

    const paymentResult = await paymentsClient.processCard(row);
    const normalized = normalizePaymentResult(paymentResult);

    return {
      ...base,
      ...normalized,
      completedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.warn('Row processing failed', {
      rowNumber: row.rowNumber,
      lastFour: row.lastFour,
      error: error.message
    });

    return {
      ...base,
      processorStatus: 'failed',
      processorStatusCode: String(error.status || ''),
      declineReason: extractDeclineReason(error.response) || '',
      errorMessage: error.message,
      completedAt: new Date().toISOString()
    };
  }
}

function validateRow(row) {
  if (!row.cardNumber) {
    throw new Error('Missing credit card number in cell 1.');
  }
  if (!row.cvv) {
    throw new Error('Missing CVV in cell 2.');
  }
  if (!row.expirationText) {
    throw new Error('Missing expiration date text in cell 3.');
  }
  if (!row.zip) {
    throw new Error('Missing ZIP code in cell 6.');
  }
}

function normalizePaymentResult(paymentResult) {
  const auth = paymentResult.auth || {};
  const retrieved = paymentResult.retrieved || {};
  const processorResponse = auth.processorResponse || auth.processor_response || retrieved.processorResponse || {};
  const status = retrieved.status || auth.status || processorResponse.status || 'unknown';
  const code = processorResponse.code || processorResponse.statusCode || auth.statusCode || retrieved.statusCode || '';
  const declineReason = extractDeclineReason(processorResponse) || (String(status).toUpperCase() === 'DECLINED' ? 'Declined' : '');

  return {
    processorStatus: String(status),
    processorStatusCode: String(code),
    declineReason,
    errorMessage: '',
    authorizationReleased: Boolean(paymentResult.voided),
    dryRun: Boolean(paymentResult.dryRun)
  };
}

function extractDeclineReason(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return (
    value.message ||
    value.detail ||
    value.reason ||
    value.error_description ||
    value.error ||
    value.Fault?.Error?.[0]?.Message ||
    ''
  );
}

module.exports = {
  processRows,
  processRow,
  normalizePaymentResult
};

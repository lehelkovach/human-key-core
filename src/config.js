require('dotenv').config();

function booleanFromEnv(value, defaultValue) {
  if (value == null || value === '') {
    return defaultValue;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function getQuickBooksConfig(overrides = {}) {
  const environment = overrides.environment || process.env.INTUIT_ENVIRONMENT || 'sandbox';
  const defaultBaseUrl =
    environment === 'production'
      ? 'https://api.intuit.com/quickbooks/v4/payments'
      : 'https://sandbox.api.intuit.com/quickbooks/v4/payments';

  return {
    environment,
    baseUrl: overrides.baseUrl || process.env.INTUIT_PAYMENTS_BASE_URL || defaultBaseUrl,
    clientId: overrides.clientId || process.env.INTUIT_CLIENT_ID,
    clientSecret: overrides.clientSecret || process.env.INTUIT_CLIENT_SECRET,
    redirectUri: overrides.redirectUri || process.env.INTUIT_REDIRECT_URI,
    accessToken: overrides.accessToken || process.env.INTUIT_ACCESS_TOKEN,
    refreshToken: overrides.refreshToken || process.env.INTUIT_REFRESH_TOKEN,
    dryRun:
      overrides.dryRun != null
        ? overrides.dryRun
        : booleanFromEnv(process.env.QUICKBOOKS_DRY_RUN, true),
    amount: overrides.amount || process.env.PREAUTH_AMOUNT || '1.00',
    currency: overrides.currency || process.env.PREAUTH_CURRENCY || 'USD'
  };
}

function getServerConfig() {
  return {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    uploadLimit: process.env.UPLOAD_LIMIT || '1mb',
    quickbooks: getQuickBooksConfig()
  };
}

module.exports = {
  getQuickBooksConfig,
  getServerConfig,
  booleanFromEnv
};

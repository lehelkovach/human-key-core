const { randomUUID } = require('crypto');
const { requireLiveExpiration } = require('./cards');
const { createLogger } = require('./logger');

class QuickBooksApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'QuickBooksApiError';
    this.status = details.status;
    this.statusText = details.statusText;
    this.response = details.response;
  }
}

class QuickBooksPaymentsClient {
  constructor(config, logger = createLogger('quickbooks-payments')) {
    this.config = config;
    this.logger = logger;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
  }

  async processCard(row) {
    if (this.config.dryRun) {
      return this.simulateDryRun(row);
    }

    const expiration = requireLiveExpiration(row.expirationText);
    const token = await this.tokenizeCard({
      number: row.cardNumber,
      cvc: row.cvv,
      expMonth: expiration.month,
      expYear: expiration.year,
      zip: row.zip
    });

    const auth = await this.preauthorize({
      token: token.id || token.value || token.token,
      amount: this.config.amount,
      currency: this.config.currency
    });
    const authId = auth.id || auth.chargeId || auth.txnId;
    const retrieved = authId ? await this.retrieveAuthorization(authId) : auth;

    let voided = null;
    if (authId && isSuccessfulAuthorization(auth, retrieved)) {
      voided = await this.voidAuthorization(authId);
    }

    return {
      token,
      auth,
      retrieved,
      voided
    };
  }

  simulateDryRun(row) {
    const declined = row.lastFour.endsWith('0000');
    const id = `dry_${randomUUID()}`;
    this.logger.info('Dry-run payment flow completed', {
      rowNumber: row.rowNumber,
      lastFour: row.lastFour,
      declined
    });

    return {
      token: {
        id: `tok_${id}`
      },
      auth: {
        id,
        status: declined ? 'DECLINED' : 'AUTHORIZED',
        processorResponse: {
          code: declined ? 'DO_NOT_HONOR' : '1000',
          message: declined ? 'Dry-run decline for test card ending 0000' : 'Dry-run authorization approved'
        }
      },
      retrieved: {
        id,
        status: declined ? 'DECLINED' : 'AUTHORIZED'
      },
      voided: declined
        ? null
        : {
            id,
            status: 'VOIDED'
          },
      dryRun: true
    };
  }

  async tokenizeCard(card) {
    this.logger.debug('Tokenizing card', { lastFour: String(card.number || '').slice(-4) });
    return this.request('/tokens', {
      method: 'POST',
      body: {
        card: {
          number: card.number,
          cvc: card.cvc,
          expMonth: card.expMonth,
          expYear: card.expYear,
          address: {
            postalCode: card.zip
          }
        }
      }
    });
  }

  async preauthorize({ token, amount, currency }) {
    this.logger.debug('Creating preauthorization', { amount, currency });
    return this.request('/charges', {
      method: 'POST',
      body: {
        amount,
        currency,
        capture: false,
        token
      }
    });
  }

  async retrieveAuthorization(id) {
    this.logger.debug('Retrieving authorization', { authorizationId: id });
    return this.request(`/charges/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  }

  async voidAuthorization(id) {
    this.logger.debug('Voiding authorization', { authorizationId: id });
    return this.request(`/charges/${encodeURIComponent(id)}/void`, {
      method: 'POST',
      body: {}
    });
  }

  async request(path, options) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: options.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Request-Id': randomUUID()
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new QuickBooksApiError('QuickBooks Payments API request failed', {
        status: response.status,
        statusText: response.statusText,
        response: payload
      });
    }

    return payload;
  }

  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (!this.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        'Live QuickBooks calls require INTUIT_ACCESS_TOKEN or INTUIT_REFRESH_TOKEN with INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET.'
      );
    }

    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      })
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new QuickBooksApiError('Unable to refresh Intuit OAuth token', {
        status: response.status,
        statusText: response.statusText,
        response: payload
      });
    }

    this.accessToken = payload.access_token;
    if (payload.refresh_token) {
      this.refreshToken = payload.refresh_token;
    }

    this.logger.info('Refreshed Intuit OAuth access token');
    return this.accessToken;
  }
}

function isSuccessfulAuthorization(auth, retrieved) {
  const statuses = [auth && auth.status, retrieved && retrieved.status].filter(Boolean).map((status) => String(status).toUpperCase());
  return statuses.some((status) => ['AUTHORIZED', 'APPROVED', 'CAPTURED', 'SUCCESS'].includes(status));
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

module.exports = {
  QuickBooksPaymentsClient,
  QuickBooksApiError,
  isSuccessfulAuthorization
};

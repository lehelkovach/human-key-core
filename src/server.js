const path = require('path');
const express = require('express');
const multer = require('multer');
const { getServerConfig } = require('./config');
const { parseCardCsv } = require('./csvRows');
const { QuickBooksPaymentsClient } = require('./quickbooksPayments');
const { createJob, getJob, subscribe } = require('./jobStore');
const { createLogger } = require('./logger');

const logger = createLogger('server');
const config = getServerConfig();
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseUploadLimit(config.uploadLimit)
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    dryRun: config.quickbooks.dryRun,
    environment: config.quickbooks.environment
  });
});

app.post('/api/jobs', upload.single('csv'), (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ error: 'Upload a CSV file in the "csv" form field.' });
      return;
    }

    const rows = parseCardCsv(request.file.buffer);
    if (rows.length === 0) {
      response.status(400).json({ error: 'CSV did not contain any processable rows.' });
      return;
    }

    logger.info('Accepted CSV upload', {
      rowCount: rows.length,
      originalName: request.file.originalname,
      dryRun: config.quickbooks.dryRun
    });

    const job = createJob(rows, () => new QuickBooksPaymentsClient(getServerConfig().quickbooks));
    response.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

app.get('/api/jobs/:id', (request, response) => {
  const job = getJob(request.params.id);
  if (!job) {
    response.status(404).json({ error: 'Job not found.' });
    return;
  }
  response.json(job);
});

app.get('/api/jobs/:id/events', (request, response) => {
  const job = getJob(request.params.id);
  if (!job) {
    response.status(404).end();
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  sendSse(response, 'snapshot', { type: 'snapshot', job });

  const unsubscribe = subscribe(request.params.id, (event) => {
    sendSse(response, event.type, event);
    if (event.type === 'completed' || event.type === 'failed') {
      response.end();
    }
  });

  request.on('close', () => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
});

app.use((error, _request, response, _next) => {
  logger.error('Request failed', { error: error.message });
  response.status(500).json({ error: error.message });
});

function sendSse(response, event, data) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function parseUploadLimit(value) {
  const match = String(value).match(/^(\d+)(kb|mb)?$/i);
  if (!match) {
    return 1024 * 1024;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  if (unit === 'mb') {
    return amount * 1024 * 1024;
  }
  if (unit === 'kb') {
    return amount * 1024;
  }
  return amount;
}

if (require.main === module) {
  app.listen(config.port, config.host, () => {
    logger.info('Intuit Card dev server listening', {
      host: config.host,
      port: config.port,
      dryRun: config.quickbooks.dryRun,
      environment: config.quickbooks.environment
    });
  });
}

module.exports = {
  app,
  parseUploadLimit
};

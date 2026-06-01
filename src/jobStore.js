const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { processRows } = require('./processor');
const { createLogger } = require('./logger');

const logger = createLogger('jobs');
const jobs = new Map();

function createJob(rows, paymentsClientFactory) {
  const id = randomUUID();
  const emitter = new EventEmitter();
  const job = {
    id,
    status: 'queued',
    total: rows.length,
    processed: 0,
    results: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emitter
  };

  jobs.set(id, job);
  setImmediate(() => runJob(job, rows, paymentsClientFactory));
  return summarizeJob(job);
}

function getJob(id) {
  const job = jobs.get(id);
  return job ? summarizeJob(job) : null;
}

function subscribe(id, listener) {
  const job = jobs.get(id);
  if (!job) {
    return null;
  }

  job.emitter.on('event', listener);
  return () => job.emitter.off('event', listener);
}

async function runJob(job, rows, paymentsClientFactory) {
  job.status = 'running';
  emit(job, 'started');

  try {
    const client = paymentsClientFactory();
    await processRows(rows, client, (result) => {
      job.results.push(result);
      job.processed += 1;
      job.updatedAt = new Date().toISOString();
      emit(job, 'progress', result);
    });

    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
    emit(job, 'completed');
    logger.info('Job completed', { jobId: job.id, total: job.total });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.updatedAt = new Date().toISOString();
    emit(job, 'failed');
    logger.error('Job failed', { jobId: job.id, error: error.message });
  }
}

function emit(job, type, result) {
  job.emitter.emit('event', {
    type,
    job: summarizeJob(job),
    result
  });
}

function summarizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    results: job.results,
    error: job.error || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

module.exports = {
  createJob,
  getJob,
  subscribe
};

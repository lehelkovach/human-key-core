#!/usr/bin/env node
const fs = require('fs/promises');
const { getQuickBooksConfig } = require('../config');
const { parseCardCsv } = require('../csvRows');
const { QuickBooksPaymentsClient } = require('../quickbooksPayments');
const { processRows } = require('../processor');
const { createLogger } = require('../logger');

const logger = createLogger('preauth-cli');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    usage();
    process.exitCode = 1;
    return;
  }

  const dryRun = args.live ? false : args.dryRun ?? true;
  const config = getQuickBooksConfig({ dryRun });
  const input = await fs.readFile(args.input);
  const rows = parseCardCsv(input);
  const client = new QuickBooksPaymentsClient(config);

  logger.info('Starting CSV preauthorization run', {
    input: args.input,
    output: args.output,
    rows: rows.length,
    dryRun: config.dryRun
  });

  const results = await processRows(rows, client, (result, processed) => {
    logger.info('Processed row', {
      rowNumber: result.rowNumber,
      lastFour: result.lastFour,
      processed,
      status: result.processorStatus
    });
  });

  if (args.output) {
    await fs.writeFile(args.output, toCsv(results));
  } else {
    process.stdout.write(JSON.stringify(results, null, 2));
    process.stdout.write('\n');
  }

  logger.info('CSV preauthorization run complete', {
    rows: rows.length,
    output: args.output || 'stdout'
  });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      args.input = argv[++index];
    } else if (arg === '--output') {
      args.output = argv[++index];
    } else if (arg === '--live') {
      args.live = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function toCsv(results) {
  const headers = [
    'rowNumber',
    'lastFour',
    'expirationDate',
    'processorStatusCode',
    'processorStatus',
    'declineReason',
    'errorMessage',
    'expirationWarning',
    'authorizationReleased',
    'dryRun'
  ];

  return [
    headers.join(','),
    ...results.map((result) => headers.map((header) => csvEscape(result[header] ?? '')).join(','))
  ].join('\n') + '\n';
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function usage() {
  console.error('Usage: npm run preauth -- --input <cards.csv> [--output results.csv] [--live]');
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('CLI failed', { error: error.message });
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  toCsv
};

# Project prompt

Build and operate a hosted development path for QuickBooks Payments CSV
preauthorization testing.

## Goals

- Run development from the `dev` branch.
- Serve a browser workflow for CSV upload and dynamic row-by-row results.
- Reuse shared QuickBooks Payments code from both the web app and CLI.
- Tokenize cards, run a `$1.00` preauthorization, retrieve the authorization,
  and void/release successful authorizations for live calls.
- Continue processing all rows even when individual rows fail.
- Avoid displaying, logging, or persisting full card numbers, CVVs, OAuth
  tokens, refresh tokens, client secrets, private keys, SSH keys, or
  Authorization headers.
- Provision or reuse an Oracle Cloud dev VM named `intuit-card-dev`.
- Deliver updates automatically when `dev` changes.
- Run the VM service with hot reload for rapid iteration.
- Surface console output and structured logs for debugging.

## CSV contract

Each row is parsed by cell position:

1. credit card number
2. CVV
3. expiration date text
4. reserved
5. reserved
6. ZIP code

The requested expiration format was written as `mm/ds`; live calls use `mm/yy`
or `mm/yyyy` until the exact intended format is clarified.

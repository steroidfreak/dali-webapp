---
title: Launching the AI Document Generator
date: 2026-04-15
summary: The SpiderWeb platform now includes an AI-powered document generator for FDW employment — contracts, salary schedules, and invoices in under a minute.
tags: document-generator,tools,fdw,ai
---

## What it does

The Document Generator creates three FDW employment documents automatically from a simple form:

- **Employment Contract** — full terms of employment, employer and FDW details, loan agreement, and legal clauses
- **Salary Payment Schedule** — month-by-month breakdown over a configurable period (default 24 months), including loan deductions
- **Monthly Invoice** — ready-to-issue invoice per payment cycle, with employer and FDW reference details

All three are generated as PDFs in seconds.

## How it works

The backend uses a DOCX template for the contract and XLSX templates for the schedule and invoice. The AI fills in the fields from the form data, then LibreOffice converts everything to PDF server-side.

The `/api/generate` endpoint accepts a JSON payload and returns all files as base64-encoded PDFs bundled in a single response.

## Document OCR

If you have photos of the FDW's passport, FIN card, or work permit, the `/api/scan` endpoint can extract the key fields automatically using AI vision — name, FIN number, passport number, nationality, and date of birth — so you don't have to type them manually.

## Next steps

More templates are planned: rest day schedules, maid transfer agreements, and termination letters. The generator will also support batch processing for agencies managing multiple FDWs at once.

Try it at [dali.spiderweb.sg/services/documents](/services/documents).

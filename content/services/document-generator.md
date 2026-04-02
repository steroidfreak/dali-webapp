---
title: Document Generator
kicker: Content automation service
summary: A clean placeholder service page for generating structured documents from prompts or form data.
---

## What this page demonstrates

This section is set up as a thin service shell for document generation. Right now the demo renders a mock markdown-style result in the browser, which keeps the front end lightweight while leaving room for an API-backed generator later.

## Why keep it modular

- You can add a dedicated route under `src/routes/api.js` for generation requests.
- You can swap the browser demo for OpenAI or internal templating without changing the page structure.
- Editors can update this page through `content/services/document-generator.md`.

## Typical future additions

- Template selection
- Export to PDF or DOCX
- Saved drafts and user history

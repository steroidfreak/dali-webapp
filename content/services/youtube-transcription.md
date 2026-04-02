---
title: YouTube Transcription
kicker: Media processing service
summary: A ready-to-extend service page for summarizing or extracting actions from YouTube transcripts.
---

## Current scope

The current page provides a simple mock flow for entering a YouTube URL and a processing objective. That keeps the interface ready while the actual transcription and summarization pipeline is still being wired.

## Why this is deployment-friendly

- The page is static until you add a backend worker or API route.
- The server already supports clean route separation, so media processing can live outside the DALI path.
- Markdown content keeps the explanatory copy editable without changing templates.

## Future backend options

- Pull captions from a transcription service
- Queue long-running jobs
- Store transcript outputs for later retrieval

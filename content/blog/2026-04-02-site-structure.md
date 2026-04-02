---
title: Site structure baseline
date: 2026-04-02
summary: Baseline notes for splitting the original DALI dashboard into a multi-service website scaffold.
tags: dali-control,document-generator,youtube-transcription
---

## Structure

The original single-page dashboard has been refactored into a modular Express application with route modules, reusable templates, static assets, and markdown-driven content.

## Content workflow

Service copy is loaded from `content/services/*.md`, and blog posts are loaded from `content/blog/*.md`. Adding new markdown files is enough to update those surfaces.

## Deployment

The app still starts with `npm start`, which makes it suitable for a DigitalOcean droplet using PM2, systemd, or a plain Node process.

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const { CONTENT_DIR } = require('../config/env');

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

function parseFrontMatter(raw) {
  if (!raw.startsWith('---\n')) {
    return { attributes: {}, body: raw };
  }

  const closingIndex = raw.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    return { attributes: {}, body: raw };
  }

  const frontMatter = raw.slice(4, closingIndex).trim();
  const body = raw.slice(closingIndex + 5).trim();
  const attributes = {};

  for (const line of frontMatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    attributes[key] = value;
  }

  return { attributes, body };
}

function readMarkdown(relativePath) {
  const filePath = path.join(CONTENT_DIR, relativePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const { attributes, body } = parseFrontMatter(raw);

  return {
    ...attributes,
    body,
    html: markdown.render(body),
    filePath,
  };
}

function listMarkdown(directory) {
  const absoluteDirectory = path.join(CONTENT_DIR, directory);
  const entries = fs
    .readdirSync(absoluteDirectory)
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .reverse();

  return entries.map((entry) => {
    const slug = entry.replace(/\.md$/, '');
    return {
      slug,
      ...readMarkdown(path.join(directory, entry)),
    };
  });
}

module.exports = {
  readMarkdown,
  listMarkdown,
};

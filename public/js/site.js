function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderSimpleMarkdown(markdown) {
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('')
    .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
}

document.addEventListener('DOMContentLoaded', () => {
  const docButton = document.querySelector('[data-doc-generate]');
  const docInput = document.querySelector('#doc-topic');
  const docOutput = document.querySelector('#doc-output');

  if (docButton && docInput && docOutput) {
    docButton.addEventListener('click', () => {
      const brief = docInput.value.trim() || 'Create a deployment handover.';
      const markdown = `# Generated draft
## Objective
- ${brief}
## Deliverables
- Deployment overview
- Environment variable checklist
- Restart and rollback steps
## Publishing notes
- Update service copy in content/services/*.md
- Add articles in content/blog/*.md`;
      docOutput.innerHTML = renderSimpleMarkdown(markdown);
    });
  }

  const ytButton = document.querySelector('[data-yt-generate]');
  const ytUrl = document.querySelector('#yt-url');
  const ytNotes = document.querySelector('#yt-notes');
  const ytOutput = document.querySelector('#yt-output');

  if (ytButton && ytUrl && ytNotes && ytOutput) {
    ytButton.addEventListener('click', () => {
      const markdown = `# Transcript summary
## Source
- ${ytUrl.value.trim() || 'No URL provided'}
## Focus
- ${ytNotes.value.trim() || 'No focus provided'}
## Highlights
- Opening context captured
- Main actions and decisions condensed
- Follow-up items grouped for review`;
      ytOutput.innerHTML = renderSimpleMarkdown(markdown);
    });
  }
});

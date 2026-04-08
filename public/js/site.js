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
      const markdown = `# Transcript summary\n## Source\n- ${ytUrl.value.trim() || 'No URL provided'}\n## Focus\n- ${ytNotes.value.trim() || 'No focus provided'}\n## Highlights\n- Opening context captured\n- Main actions and decisions condensed\n- Follow-up items grouped for review`;
      ytOutput.innerHTML = renderSimpleMarkdown(markdown);
    });
  }

  const testAlertBtn = document.querySelector('#test-alert-btn');
  if (testAlertBtn) {
    testAlertBtn.addEventListener('click', () => {
      const chatId = document.querySelector('#tg-chat-id')?.value.trim();
      const statusEl = document.querySelector('#tg-status');
      if (!chatId) {
        statusEl.textContent = 'Please enter your Telegram User ID.';
        statusEl.style.color = '#cc0000';
        return;
      }
      testAlertBtn.textContent = 'Sending…';
      testAlertBtn.disabled = true;
      statusEl.textContent = '';
      fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            testAlertBtn.textContent = 'Sent!';
            statusEl.textContent = 'Check your Telegram — message should arrive in seconds.';
            statusEl.style.color = 'var(--success)';
          } else {
            testAlertBtn.textContent = 'Failed';
            statusEl.textContent = data.error || 'Failed — check your credentials.';
            statusEl.style.color = '#cc0000';
          }
          setTimeout(() => {
            testAlertBtn.textContent = 'Send Test Alert';
            testAlertBtn.disabled = false;
          }, 3000);
        })
        .catch(() => {
          testAlertBtn.textContent = 'Failed';
          statusEl.textContent = 'Network error — is the server running?';
          statusEl.style.color = '#cc0000';
          testAlertBtn.disabled = false;
        });
    });
  }

  const testEmailBtn = document.querySelector('#test-email-btn');
  if (testEmailBtn) {
    testEmailBtn.addEventListener('click', () => {
      const smtpHost = document.querySelector('#smtp-host')?.value.trim();
      const smtpPort = document.querySelector('#smtp-port')?.value.trim();
      const smtpUser = document.querySelector('#smtp-user')?.value.trim();
      const smtpPass = document.querySelector('#smtp-pass')?.value;
      const smtpTo = document.querySelector('#smtp-to')?.value.trim();
      const statusEl = document.querySelector('#email-status');
      if (!smtpHost || !smtpUser || !smtpPass || !smtpTo) {
        statusEl.textContent = 'Please fill in all fields.';
        statusEl.style.color = '#cc0000';
        return;
      }
      testEmailBtn.textContent = 'Sending…';
      testEmailBtn.disabled = true;
      statusEl.textContent = '';
      fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpHost, smtpPort: smtpPort || 587, smtpUser, smtpPass, smtpTo }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            testEmailBtn.textContent = 'Sent!';
            statusEl.textContent = 'Email sent — check your inbox.';
            statusEl.style.color = 'var(--success)';
          } else {
            testEmailBtn.textContent = 'Failed';
            statusEl.textContent = data.error || 'Failed — check your SMTP settings.';
            statusEl.style.color = '#cc0000';
          }
          setTimeout(() => {
            testEmailBtn.textContent = 'Send Test Email';
            testEmailBtn.disabled = false;
          }, 3000);
        })
        .catch(() => {
          testEmailBtn.textContent = 'Failed';
          statusEl.textContent = 'Network error — is the server running?';
          statusEl.style.color = '#cc0000';
          testEmailBtn.disabled = false;
        });
    });
  }
});

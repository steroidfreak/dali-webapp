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

/* ---------------------------------------------------------------------------
   UX polish runtime — page entrance, scroll reveal, image fade, link prefetch
   --------------------------------------------------------------------------- */
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function markBodyLoaded() {
  // Next frame so the initial styles are committed before the transition runs.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  });
}

function setupImageFade() {
  const imgs = document.querySelectorAll('img:not(.brand-mark__logo):not(.camera-card__stream)');
  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
      return;
    }
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
  });
}

function setupScrollReveal() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Auto-tag candidate elements that should fade in on scroll.
  const autoSelectors = [
    '.section-block',
    '.content-grid',
    '.blog-grid',
    '.service-grid',
    '.dali-grid',
    '.summary-strip',
    '.mkt-section',
    '.rtl-section',
    '.qc-section-cards',
    '.zone-grid',
    '.live-panel',
  ];
  document.querySelectorAll(autoSelectors.join(',')).forEach((el) => {
    if (!el.classList.contains('reveal') && !el.classList.contains('reveal-stagger')) {
      // Use stagger for grid-style containers, plain reveal otherwise.
      const isGrid =
        el.classList.contains('blog-grid') ||
        el.classList.contains('service-grid') ||
        el.classList.contains('dali-grid') ||
        el.classList.contains('summary-strip') ||
        el.classList.contains('qc-section-cards') ||
        el.classList.contains('zone-grid');
      el.classList.add(isGrid ? 'reveal-stagger' : 'reveal');
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => observer.observe(el));
}

function setupLinkPrefetch() {
  // Prefetch internal pages on hover/focus for snappier nav.
  if (!('requestIdleCallback' in window)) return;
  const prefetched = new Set();
  const prefetch = (href) => {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  };
  document.querySelectorAll('a[href^="/"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('//') || href.startsWith('/api') || href.startsWith('/cam') || href.startsWith('/socket.io')) return;
    a.addEventListener('mouseenter', () => prefetch(href), { passive: true });
    a.addEventListener('focus', () => prefetch(href), { passive: true });
    a.addEventListener('touchstart', () => prefetch(href), { passive: true });
  });
}

function setupPageLeaveTransition() {
  if (prefersReducedMotion) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      a.target === '_blank' ||
      a.hasAttribute('download') ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      e.button !== 0
    ) {
      return;
    }
    // Only handle same-origin navigations
    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    document.body.classList.add('is-leaving');
  }, { capture: true });

  // If the user comes back via bfcache, undo the leaving state.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('is-leaving');
      document.body.classList.add('is-loaded');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', markBodyLoaded);
} else {
  markBodyLoaded();
}

document.addEventListener('DOMContentLoaded', () => {
  setupImageFade();
  setupScrollReveal();
  setupLinkPrefetch();
  setupPageLeaveTransition();

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

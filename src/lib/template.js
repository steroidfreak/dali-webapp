function renderLayout({ title, description, pathname, heroKicker, heroTitle, heroText, body, scripts = [] }) {
  const navItems = [
    { href: '/', label: 'Overview' },
    { href: '/services/dali-control', label: 'DALI Control' },
    { href: '/services/document-generator', label: 'Document Generator' },
    { href: '/services/youtube-transcription', label: 'YouTube Transcription' },
    { href: '/blog', label: 'Blog' },
  ];

  const nav = navItems
    .map((item) => {
      const isActive = pathname === item.href;
      return `<a class="site-nav__link${isActive ? ' is-active' : ''}" href="${item.href}">${item.label}</a>`;
    })
    .join('');

  const scriptTags = scripts.map((src) => `<script src="${src}" defer></script>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body data-pathname="${pathname}">
  <div class="site-shell">
    <header class="site-header">
      <a class="brand-mark" href="/">
        <span class="brand-mark__eyebrow">DALI</span>
        <span class="brand-mark__name">Service Studio</span>
      </a>
      <nav class="site-nav">${nav}</nav>
    </header>
    <main>
      <section class="hero">
        <div class="hero__copy">
          <p class="hero__kicker">${heroKicker}</p>
          <h1>${heroTitle}</h1>
          <p class="hero__text">${heroText}</p>
        </div>
      </section>
      ${body}
    </main>
  </div>
  ${scriptTags}
</body>
</html>`;
}

function renderServicePage({ pathname, service, demoMarkup, relatedPosts }) {
  const postMarkup = relatedPosts.length
    ? relatedPosts
        .map(
          (post) => `
            <article class="blog-card">
              <p class="blog-card__meta">${post.date}</p>
              <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
              <p>${post.summary}</p>
            </article>
          `
        )
        .join('')
    : '<p class="empty-state">No blog posts yet.</p>';

  return renderLayout({
    title: `${service.title} | DALI Service Studio`,
    description: service.summary,
    pathname,
    heroKicker: service.kicker,
    heroTitle: service.title,
    heroText: service.summary,
    body: `
      <section class="content-grid">
        <article class="content-card markdown-body">
          ${service.html}
        </article>
        <aside class="content-card service-facts">
          <h2>Deployment Notes</h2>
          <ul class="fact-list">
            <li>Express server with static assets and API routes.</li>
            <li>Markdown files in <code>content/</code> drive page copy.</li>
            <li>DigitalOcean-friendly startup using <code>npm start</code>.</li>
          </ul>
        </aside>
      </section>
      ${demoMarkup}
      <section class="section-block">
        <div class="section-heading">
          <p class="section-heading__eyebrow">Blog</p>
          <h2>Implementation notes related to this service</h2>
        </div>
        <div class="blog-grid">
          ${postMarkup}
        </div>
      </section>
    `,
    scripts: service.slug === 'dali-control'
      ? ['/socket.io/socket.io.js', '/js/dali-demo.js', '/js/site.js']
      : ['/js/site.js'],
  });
}

module.exports = {
  renderLayout,
  renderServicePage,
};

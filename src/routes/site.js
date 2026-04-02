const express = require('express');

const { listMarkdown, readMarkdown } = require('../lib/content');
const { renderLayout, renderServicePage } = require('../lib/template');

function createHomePage(posts) {
  const highlightedPosts = posts.slice(0, 3)
    .map(
      (post) => `
        <article class="blog-card">
          <p class="blog-card__meta">${post.date}</p>
          <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
          <p>${post.summary}</p>
        </article>
      `
    )
    .join('');

  return renderLayout({
    title: 'DALI Service Studio',
    description: 'Service pages for DALI control, document generation, and YouTube transcription.',
    pathname: '/',
    heroKicker: 'DigitalOcean-ready web stack',
    heroTitle: 'One site, three service demos, clean server boundaries.',
    heroText: 'The DALI bridge stays available under its own tab while document generation, transcription, and blog content stay editable through markdown files.',
    body: `
      <section class="section-block">
        <div class="section-heading">
          <p class="section-heading__eyebrow">Services</p>
          <h2>Modular entry points</h2>
        </div>
        <div class="service-grid">
          <a class="service-card" href="/services/dali-control">
            <p class="service-card__eyebrow">Live demo</p>
            <h3>DALI Control</h3>
            <p>Real-time Socket.IO dashboard backed by MQTT and Express APIs.</p>
          </a>
          <a class="service-card" href="/services/document-generator">
            <p class="service-card__eyebrow">Demo</p>
            <h3>Document Generator</h3>
            <p>Lightweight browser-side preview for turning prompts into structured markdown output.</p>
          </a>
          <a class="service-card" href="/services/youtube-transcription">
            <p class="service-card__eyebrow">Demo</p>
            <h3>YouTube Transcription</h3>
            <p>Transcript summarization interface with a clean placeholder flow for future API wiring.</p>
          </a>
        </div>
      </section>
      <section class="section-block">
        <div class="section-heading">
          <p class="section-heading__eyebrow">Content</p>
          <h2>Markdown-managed copy and blog</h2>
        </div>
        <div class="blog-grid">
          ${highlightedPosts}
        </div>
      </section>
    `,
    scripts: ['/js/site.js'],
  });
}

function createDaliDemoMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Demo</p>
        <h2>Live DALI control panel</h2>
      </div>
      <div class="content-card">
        <div class="demo-toolbar">
          <div>
            <strong>Broker status</strong>
            <p class="demo-toolbar__text">The existing MQTT and Socket.IO server code is mounted under this service page.</p>
          </div>
          <div class="connection-pill" data-connection-pill>Disconnected</div>
        </div>
        <div class="summary-strip" id="dali-summary"></div>
        <div class="dali-grid" id="dali-grid"></div>
      </div>
    </section>
  `;
}

function createDocumentGeneratorDemoMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Demo</p>
        <h2>Prompt-to-document mock flow</h2>
      </div>
      <div class="demo-split">
        <div class="content-card">
          <label class="field-label" for="doc-topic">Brief</label>
          <textarea id="doc-topic" class="input-area" placeholder="Describe the document you want to generate.">Create a site handover summary for a DigitalOcean deployment with environment variables, restart steps, and content update notes.</textarea>
          <button class="primary-button" type="button" data-doc-generate>Generate draft</button>
        </div>
        <article class="content-card markdown-body" id="doc-output">
          <h3>Generated draft</h3>
          <p>Use the demo button to render a sample markdown-style response.</p>
        </article>
      </div>
    </section>
  `;
}

function createYoutubeDemoMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Demo</p>
        <h2>Transcript summary mock flow</h2>
      </div>
      <div class="demo-split">
        <div class="content-card">
          <label class="field-label" for="yt-url">YouTube URL</label>
          <input id="yt-url" class="text-input" type="url" value="https://www.youtube.com/watch?v=demo123">
          <label class="field-label" for="yt-notes">Focus</label>
          <textarea id="yt-notes" class="input-area" placeholder="What do you want from the transcript?">Extract the main actions, decisions, and follow-up items.</textarea>
          <button class="primary-button" type="button" data-yt-generate>Summarize transcript</button>
        </div>
        <article class="content-card markdown-body" id="yt-output">
          <h3>Transcript summary</h3>
          <p>The page is wired for a simple demo now and can later be connected to an actual transcription pipeline.</p>
        </article>
      </div>
    </section>
  `;
}

function createSiteRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    const posts = listMarkdown('blog');
    res.send(createHomePage(posts));
  });

  router.get('/services/:slug', (req, res, next) => {
    const { slug } = req.params;

    try {
      const service = readMarkdown(`services/${slug}.md`);
      const posts = listMarkdown('blog').filter((post) => {
        const tags = (post.tags || '').split(',').map((tag) => tag.trim());
        return tags.includes(slug);
      });

      let demoMarkup = '';
      if (slug === 'dali-control') {
        demoMarkup = createDaliDemoMarkup();
      } else if (slug === 'document-generator') {
        demoMarkup = createDocumentGeneratorDemoMarkup();
      } else if (slug === 'youtube-transcription') {
        demoMarkup = createYoutubeDemoMarkup();
      } else {
        next();
        return;
      }

      res.send(renderServicePage({
        pathname: req.path,
        service: { ...service, slug },
        demoMarkup,
        relatedPosts: posts,
      }));
    } catch (error) {
      next();
    }
  });

  router.get('/blog', (req, res) => {
    const posts = listMarkdown('blog');
    const cards = posts
      .map(
        (post) => `
          <article class="blog-card">
            <p class="blog-card__meta">${post.date}</p>
            <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
            <p>${post.summary}</p>
          </article>
        `
      )
      .join('');

    res.send(renderLayout({
      title: 'Blog | DALI Service Studio',
      description: 'Blog scaffold backed by markdown files.',
      pathname: '/blog',
      heroKicker: 'Publishing surface',
      heroTitle: 'Blog scaffold is ready.',
      heroText: 'Drop markdown files into content/blog to publish new posts without touching the route layer.',
      body: `<section class="blog-grid">${cards}</section>`,
      scripts: ['/js/site.js'],
    }));
  });

  router.get('/blog/:slug', (req, res, next) => {
    try {
      const post = readMarkdown(`blog/${req.params.slug}.md`);
      res.send(renderLayout({
        title: `${post.title} | DALI Service Studio`,
        description: post.summary,
        pathname: '/blog',
        heroKicker: post.date,
        heroTitle: post.title,
        heroText: post.summary,
        body: `<article class="content-card markdown-body">${post.html}</article>`,
        scripts: ['/js/site.js'],
      }));
    } catch (error) {
      next();
    }
  });

  router.use((req, res) => {
    res.status(404).send(renderLayout({
      title: 'Not Found | DALI Service Studio',
      description: 'The requested page was not found.',
      pathname: '',
      heroKicker: '404',
      heroTitle: 'Page not found',
      heroText: 'The route does not exist in the current scaffold.',
      body: '<section class="content-card"><p>Check the navigation to continue.</p></section>',
      scripts: ['/js/site.js'],
    }));
  });

  return router;
}

module.exports = { createSiteRouter };

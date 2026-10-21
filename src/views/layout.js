import { html, raw } from './html.js';
import { site } from '../site.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap';

export function layout({ title, description, image, path = '/', body, scripts = [], robots }) {
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} · ${site.owner}`;
  const url = site.url + path;
  return '<!doctype html>' + html`
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
${description && html`<meta name="description" content="${description}">`}
${robots && html`<meta name="robots" content="${robots}">`}
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${title || site.owner}">
${description && html`<meta property="og:description" content="${description}">`}
${image && html`<meta property="og:image" content="${image.startsWith('http') ? image : site.url + image}">`}
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#F6F6F0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/site.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${body}
${scripts.map((s) => html`<script src="${s}" defer></script>`)}
</body>
</html>`;
}

export { raw };

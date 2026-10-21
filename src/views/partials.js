import { html, raw, formatDate } from './html.js';
import { site } from '../site.js';
import { readMinutes } from '../store.js';

export const NAV = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/about', label: 'About', key: 'about' },
  { href: '/stories', label: 'Stories', key: 'stories' },
  { href: '/philanthropy', label: 'Philanthropy', key: 'philanthropy' },
  { href: '/contact', label: 'Contact', key: 'contact' },
];

const svg = (body, size = 20, extra = '') =>
  raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"${extra}>${body}</svg>`);

export const icons = {
  phone: (s) => svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', s),
  heart: (s) => svg('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>', s),
  heartPlus: (s) => svg('<path d="M12 21c-4-3-8-6.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4.5-4 8-8 11z"/><path d="M12 9v6M9 12h6"/>', s),
  heartSolid: (s) => svg('<path d="M12 21c-4-3-8-6.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4.5-4 8-8 11z"/>', s),
  book: (s) => svg('<path d="M4 19V8a2 2 0 0 1 2-2h5v13H6a2 2 0 0 0-2 2zM20 19V8a2 2 0 0 0-2-2h-5v13h5a2 2 0 0 1 2 2z"/>', s),
  mic: (s) => svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>', s),
  globe: (s) => svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>', s),
  house: (s) => svg('<path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/>', s),
  cross: (s) => svg('<path d="M12 3v18M7 8h10"/>', s),
  target: (s) => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>', s),
  hand: (s) => svg('<path d="M7 11V7a2 2 0 0 1 4 0v4M11 10V5a2 2 0 0 1 4 0v6M15 9a2 2 0 0 1 4 0v4a8 8 0 0 1-8 8h-1a6 6 0 0 1-5-3l-2-4a1.8 1.8 0 0 1 3-2l1 1.5"/>', s),
  mail: (s) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', s),
  pin: (s) => svg('<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', s),
  check: (s) => svg('<path d="M4 12l5 5L20 6"/>', s, ' stroke-width="2"'),
  instagram: (s) => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8"/>', s),
  facebook: (s) => svg('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>', s),
  linkedin: (s) => svg('<rect x="3" y="9" width="4" height="12"/><circle cx="5" cy="4.5" r="1.8"/><path d="M11 21V9h4v2a4 4 0 0 1 7 3v7h-4v-6a2 2 0 0 0-4 0v6z"/>', s),
  youtube: (s) => svg('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>', s),
  link: (s) => svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', s),
  play: (s) => raw(`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`),
};

export const longArrow = raw('<svg width="176" height="8" viewBox="0 0 176 8" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M0 4h174M170 1l4 3-4 3"/></svg>');

export function siteNav(current) {
  return html`<nav class="site-nav" aria-label="Main">
    <a class="logo" href="/"><em class="s">${site.name}</em></a>
    <div class="nav-links">
      ${NAV.map((n) => html`<a href="${n.href}"${raw(n.key === current ? ' aria-current="page"' : '')}>${n.label}</a>`)}
    </div>
    <a class="nav-cta" href="/contact#form">
      <span class="ring">${icons.mail(16)}</span>
      <span class="two-line"><small>Say hello</small>Get in touch</span>
    </a>
  </nav>`;
}

// Framed hero: photo in a rounded frame, nav on top, content bottom-left.
export function hero({ current, image, pos = 'center', shade = 0.45, label, minHeight = 600, body }) {
  return html`<header class="hero" style="--hero-h: ${minHeight}px">
    <div class="hero-photo" role="img" aria-label="${label}" style="--img: url('${image}'); --pos: ${pos}; --shade: ${shade}"></div>
    ${siteNav(current)}
    <div class="hero-body">${body}</div>
  </header>`;
}

export function barHeader(current) {
  return html`<header class="bar">${siteNav(current)}</header>`;
}

export function breadcrumb(label) {
  return html`<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${label}</span></nav>`;
}

const NL_NOTES = {
  ok: ['ok', "You're on the list. Thank you!"],
  exists: ['ok', "You're already subscribed. Thank you!"],
  invalid: ['err', 'That email address doesn’t look right. Please try again.'],
  error: ['err', 'Something went wrong. Please try again in a moment.'],
};

export function footer({ path = '/', nl, blurb = 'Reflections on wellness, faith and family, straight to your inbox.' } = {}) {
  const note = NL_NOTES[nl];
  return html`<footer class="site-footer" id="newsletter">
    <div class="wrap">
      <div class="footer-top">
        <div class="pitch">
          <strong>Gentle reads, <em class="s">once a month</em></strong>
          <p>${blurb}</p>
        </div>
        <form class="newsletter" method="post" action="/subscribe">
          <label for="nl-email">Email address</label>
          <div class="row">
            <input id="nl-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com">
            <input type="hidden" name="back" value="${path}">
            <span class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></span>
            <button type="submit">Subscribe</button>
          </div>
          ${note && html`<p class="note ${note[0]}" role="status">${note[1]}</p>`}
        </form>
      </div>
      <div class="footer-bottom">
        <a class="logo" href="/"><em class="s">${site.name}</em></a>
        <span>© ${new Date().getFullYear()} ${site.owner}. All rights reserved.</span>
        <nav aria-label="Legal"><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav>
      </div>
    </div>
  </footer>`;
}

export function postCard(p, { excerpt = true, meta = true } = {}) {
  const href = `/stories/${p.slug}`;
  return html`<article class="post-card reveal">
    <a class="media" href="${href}" tabindex="-1" aria-hidden="true">
      ${p.image ? html`<img src="${p.image}" alt="" loading="lazy">` : html`<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`}
    </a>
    <div class="panel">
      <a class="tag" href="/stories?topic=${encodeURIComponent(p.category)}">${p.category}</a>
      <h3><a href="${href}">${p.title}</a></h3>
      ${meta && html`<span class="meta">${formatDate(p.date)} · ${readMinutes(p.body)} min read</span>`}
      ${excerpt && p.excerpt && html`<p>${p.excerpt}</p>`}
      <a class="read-more" href="${href}" aria-label="Read more: ${p.title}">READ MORE${longArrow}</a>
    </div>
  </article>`;
}

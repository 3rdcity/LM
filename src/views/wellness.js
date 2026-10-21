// Wellness Without Limits landing page. It's a separate brand from Leya.M,
// so it has its own head, nav, footer and stylesheet (public/css/wwl.css).
// Copy is taken word for word from the design, lorem ipsum included, until
// the client sends the real text. Photos in images/wwl/ are stand-ins cut
// from the design mockup; swap in the full-size originals when they arrive.

import { html } from './html.js';
import { site } from '../site.js';
import { NL_NOTES } from './partials.js';

const PATH = '/wellness-without-limits';
const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@62..125,400..800&family=Bebas+Neue&family=Inter:wght@300;400;500;600&family=Marcellus&display=swap';
const LOREM = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.';
const LOREM_LONG = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.';

const IMG = '/images/wwl/';

// Three figures in a ring, drawn after the logo in the design.
const logoMark = html`<svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
  <path d="M7 30a18 18 0 0 0 33 7" fill="none" stroke="#2E9A4B" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M40 18a18 18 0 0 0-26-9" fill="none" stroke="#E4892A" stroke-width="3" stroke-linecap="round"/>
  <circle cx="15" cy="16" r="3.4" fill="#1C78B8"/><path d="M15 21l-6 5m6-5 2 13m-2-13 7 2" stroke="#1C78B8" stroke-width="3.2" stroke-linecap="round" fill="none"/>
  <circle cx="25" cy="13" r="3.4" fill="#2E9A4B"/><path d="M25 18l-1 14m1-14-6-3m6 3 7-4" stroke="#2E9A4B" stroke-width="3.2" stroke-linecap="round" fill="none"/>
  <circle cx="34" cy="19" r="3" fill="#E4892A"/><path d="M34 23l-2 11m2-11 5 3m-5-3-5 1" stroke="#E4892A" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

const logo = (cls = '') => html`<a class="wwl-logo ${cls}" href="${PATH}" aria-label="Wellness Without Limits, home">
  ${logoMark}<span><b>Wellness</b><small>Without Limits</small></span>
</a>`;

const ICONS = {
  twitter: 'M22 5.8a8.3 8.3 0 0 1-2.4.7 4.1 4.1 0 0 0 1.8-2.3 8.2 8.2 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5 4 4 0 0 1-1.9-.5 4.1 4.1 0 0 0 3.3 4 4.1 4.1 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.9A8.2 8.2 0 0 1 2 18.3a11.6 11.6 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5A8.3 8.3 0 0 0 22 5.8z',
  facebook: 'M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2z',
  youtube: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z',
};
const icon = (name) => html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}" fill="currentColor"/></svg>`;
const social = (names, cls) => html`<ul class="wwl-social ${cls}">
  ${names.map((n) => html`<li><a href="${site.social[n] || '#'}" aria-label="${n[0].toUpperCase() + n.slice(1)}">${icon(n)}</a></li>`)}
</ul>`;

const marqueeRow = (words, dark, reverse) => html`<div class="marquee-row${reverse ? ' rev' : ''}" aria-hidden="true">
  <div class="marquee-track">
    ${[0, 1].map(() => html`<span class="marquee-set">
      ${words.map((w, i) => html`<span class="${i === dark ? 'dark' : ''}">${w}</span>`)}
      <svg class="mark" viewBox="0 0 48 48"><use href="#wwl-mark"/></svg>
    </span>`)}
  </div>
</div>`;

const FEATURED = [
  { tag: 'Fitness', title: 'Small Daily Choices That Elevate Overall Wellness', author: 'Kiera Hunt', date: 'April 10, 2025', image: 'article-1.jpg' },
  { tag: 'Health', title: 'Healthy Eating Tips For A Balanced Lifestyle', author: 'Dana Cotton', date: 'April 10, 2025', image: 'article-2.jpg' },
];
const POPULAR = [
  { title: 'Boost Your Energy Naturally With Daily Movement', author: 'Kiera Hunt' },
  { title: 'Simple Morning Rituals To Transform Your Day', author: 'Finlay Rees' },
  { title: 'Build Strength Safely Using Smart Training Habits', author: 'Dana Cotton' },
  { title: 'Improve Sleep Quality Through Mindful Evening Practices', author: 'Kiera Hunt' },
];
const RECIPES = [
  { image: 'recipe-1.jpg', alt: 'Sliced steak with greens, chilli and cashews' },
  { image: 'recipe-2.jpg', alt: 'A bowl of oat cookies' },
  { image: 'recipe-3.jpg', alt: 'Grilled pork chop with apple and broccolini' },
  { image: 'recipe-3.jpg', alt: 'Grilled pork chop with apple and broccolini' },
];

const FOOTER_COLS = [
  ['Quick Link', ['Home', 'About', 'Event', 'Services']],
  ['Support', ['Terms & Conditions', 'Privacy Policy', 'Contact Support', 'Help Center']],
  ['Community', ['Community Forum', 'Member Stories', 'Join the Club', 'Photo Gallery']],
];
const FOOTER_HREF = { Home: PATH, About: '#about', 'Terms & Conditions': '/terms', 'Privacy Policy': '/privacy', 'Contact Support': '/contact', 'Join the Club': '#join' };

export function wellnessPage({ nl } = {}) {
  const note = NL_NOTES[nl];
  return '<!doctype html>' + html`
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wellness Without Limits · Humanity, Connection, Truth</title>
<meta name="description" content="Wellness Without Limits: a community for fitness, nutrition and health.">
<link rel="canonical" href="${site.url + PATH}">
<meta property="og:title" content="Wellness Without Limits">
<meta property="og:image" content="${site.url + IMG}hero.jpg">
<meta name="theme-color" content="#017D7D">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/wwl.css">
</head>
<body class="wwl">
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="wwl-mark" viewBox="0 0 48 48">${logoMark}</symbol></svg>
<a class="skip-link" href="#main">Skip to content</a>

<header class="hero" id="top">
  <div class="hero-photo" role="img" aria-label="A speaker talking with his hands in a bright, leafy room"></div>
  <div class="hero-top">
    ${logo()}
    <nav class="pill-nav" aria-label="Main">
      <a href="${PATH}" aria-current="page">Home</a>
      <a href="#about">About</a>
      <a href="#">Directory</a>
      <a href="#recipes">Recipes</a>
    </nav>
    ${social(['twitter', 'facebook'], 'round')}
  </div>
  <div class="hero-body">
    <div class="hero-title">
      <p class="tagline">Wellness. Without. Limits.</p>
      <h1>Humanity<br>Connection<br>Truth</h1>
    </div>
    <div class="hero-aside">
      <p>${LOREM} Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque.</p>
      <a class="btn-white" href="#about">Learn More</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="marquee" aria-label="Community, wellness, health, nutrition">
    ${marqueeRow(['Community', 'Wellness', 'Health', 'Nutrition'], 0, false)}
    ${marqueeRow(['Health', 'Nutrition', 'Community', 'Wellness'], 1, true)}
  </section>

  <section class="about" id="about">
    <div class="wrap-sm">
      <div class="about-intro">
        <p class="label">About Us</p>
        <h2>Making songs from the heart for everyone hearts</h2>
        <p class="small">${LOREM_LONG}</p>
      </div>
      <div class="about-grid">
        <div class="about-left">
          <img class="r12" src="${IMG}about-wide.jpg" alt="A group running drills together on an outdoor court" loading="lazy">
          <div class="about-cols">
            <div><h3>Heading One</h3><p class="small">${LOREM} Sed do eiusmod tempor.</p></div>
            <div><h3>Heading Two</h3><p class="small">${LOREM} Sed do eiusmod tempor.</p></div>
          </div>
        </div>
        <img class="r12 about-tall" src="${IMG}about-tall.jpg" alt="Four friends in workout clothes laughing on a rooftop" loading="lazy">
      </div>
    </div>
  </section>

  <section class="join" id="join" aria-labelledby="join-h">
    <div class="join-photo" role="img" aria-label="Friends talking and smiling in a plant-filled courtyard"></div>
    <div class="wrap-sm join-body">
      <div>
        <p class="kicker">Community</p>
        <h2 id="join-h">Join today go<br>beyond limits</h2>
      </div>
      <div class="join-actions">
        <a class="btn-teal" href="/contact">Join Our Club</a>
        <a class="btn-line" href="#about">Learn More</a>
      </div>
    </div>
  </section>

  <section class="experts" aria-labelledby="experts-h">
    <div class="wrap">
      <div class="experts-head">
        <span class="ghost" aria-hidden="true">Community</span>
        <h2 id="experts-h">Learn from the experts</h2>
      </div>
      <div class="experts-grid">
        <div>
          <ul class="chips">${['Fitness', 'Wellness', 'Health', 'Nutrition'].map((t) => html`<li><a href="#">${t}</a></li>`)}</ul>
          <div class="feature-cards">
            ${FEATURED.map((p) => html`<article class="feature-card">
              <img src="${IMG + p.image}" alt="" loading="lazy">
              <div class="feature-body">
                <span class="tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2"/></svg>${p.tag}</span>
                <h3><a href="#">${p.title}</a></h3>
                <p class="meta"><span class="avatar" aria-hidden="true"></span>${p.author}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>${p.date}</p>
              </div>
            </article>`)}
          </div>
        </div>
        <aside class="popular" aria-labelledby="popular-h">
          <h2 id="popular-h">Popular News</h2>
          <ol>
            ${POPULAR.map((p, i) => html`<li>
              <img src="${IMG}news-${i + 1}.jpg" alt="" loading="lazy">
              <div>
                <h3><a href="#">${p.title}</a></h3>
                <p class="meta">${p.author}<span aria-hidden="true">|</span>March 10, 2025</p>
              </div>
            </li>`)}
          </ol>
        </aside>
      </div>
      <hr>
    </div>
  </section>

  <section class="recipes" id="recipes" aria-labelledby="recipes-h">
    <div class="wrap">
      <p class="kicker">What we’re eating</p>
      <h2 id="recipes-h">Recommended Recipes</h2>
    </div>
    <ul class="recipe-row">
      ${RECIPES.map((r) => html`<li><a href="#"><img src="${IMG + r.image}" alt="${r.alt}" loading="lazy"></a></li>`)}
    </ul>
  </section>
</main>

<footer class="wwl-footer" id="newsletter">
  <div class="wrap-sm">
    <div class="footer-sub">
      <h2>Subscribe for weekly<br>running updates</h2>
      <form method="post" action="/subscribe">
        <label class="sr-only" for="wwl-email">Email address</label>
        <input id="wwl-email" name="email" type="email" required autocomplete="email" placeholder="Add email">
        <input type="hidden" name="back" value="${PATH}">
        <span class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></span>
        <button type="submit">Subscribe</button>
      </form>
      ${note && html`<p class="note ${note[0]}" role="status">${note[1]}</p>`}
    </div>
    <div class="footer-mid">
      <div class="footer-brand">
        ${logo('light')}
        <p>Lorem ipsum dolor sit amet consectetur adipiscing elit. Viverra potenti nunc suspendisse tortor condimentum sagittis penatibus orci porta.</p>
        ${social(['facebook', 'twitter', 'youtube'], '')}
      </div>
      ${FOOTER_COLS.map(([h, links]) => html`<nav aria-label="${h}">
        <h3>${h}</h3>
        <ul>${links.map((l) => html`<li><a href="${FOOTER_HREF[l] || '#'}">${l}</a></li>`)}</ul>
      </nav>`)}
    </div>
    <div class="footer-bottom">
      <span>2025 Copyright © Sparklethings</span>
      ${social(['facebook', 'twitter', 'youtube'], '')}
    </div>
  </div>
</footer>
</body>
</html>`;
}

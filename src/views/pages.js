import { html, raw, formatDate } from './html.js';
import { layout } from './layout.js';
import { hero, barHeader, breadcrumb, footer, postCard, icons, longArrow } from './partials.js';
import { site, link } from '../site.js';
import { readMinutes } from '../store.js';
import { renderMarkdown } from '../markdown.js';

const ext = (url) => (url ? raw(' target="_blank" rel="noopener"') : '');

// ---------------------------------------------------------------- Home
// Wellness Without Limits links to its own site when there is one, otherwise
// to its card on the philanthropy page.
const wwlLink = () => site.ventures.wellnessWithoutLimits || '/philanthropy#wellness-without-limits';
const arrow = (href) => (href.startsWith('http') ? '↗' : '→');

export function homePage({ latest, nl }) {
  const { ventures: v, copy, stats, video } = site;
  const body = html`
${hero({
  current: 'home',
  minHeight: 760,
  slides: [
    { image: '/images/hero-wildflower-field.jpg', pos: '62% 35%', shade: 0.42, label: 'Leya with eyes closed and hands clasped, standing in a field of yellow wildflowers at golden hour' },
    { image: '/images/gym-training.jpg', pos: 'center 45%', posMobile: '40% center', shade: 0.34, label: 'Leya crouched low on a gym floor mid-workout, in a cap, gloves and camo leggings' },
  ],
  body: html`
    <div>
      <span class="eyebrow light">Faith-led wellness advocate</span>
      <h1 class="h1">Room to breathe. <br>Help that <em class="s">stays</em></h1>
      <div class="hero-intro">
        <a class="btn btn-light" href="#about">Explore</a>
        <p>I’m Leya Mnangagwa, a faith-led leader, wellness advocate, founder and mother of four learning to live in truth every day.</p>
      </div>
    </div>
    <div class="hero-meta">
      <div class="supported">
        <span class="avatars" aria-hidden="true"><span></span><span></span><span></span></span>
        <span>${stats.peopleSupported}+ people supported</span>
      </div>
      <div class="chips"><span class="chip">Faith-led</span><span class="chip">Wellness advocate</span></div>
    </div>`,
})}
<main id="main">

<section id="about" class="section">
  <div class="wrap split home-about">
    <img class="photo reveal" src="/images/portrait-smiling-field.jpg" alt="Leya Mnangagwa smiling softly in a sunlit field" style="object-position: center 25%">
    <div class="stack">
      <span class="eyebrow">About me</span>
      <h2 class="h2 reveal">A life lived <em class="s">in full colour</em></h2>
      <p class="lede" style="color: var(--body)">I'm Leya: wife, mother of four, founder and mentor. Life has taught me that growth begins with truth and healing starts from within. This is where I share that journey honestly, so you never have to walk yours alone.</p>
      <a class="btn btn-primary" href="/about">Read my story</a>
      <div class="walk-list">
        <h3>Ways to walk with me</h3>
        <div class="walk-item">
          <span class="icon-chip round">${icons.heart(18)}</span>
          <div><a href="/stories">Read the journal →</a><p>Honest reflections on faith, family and wellness.</p></div>
        </div>
        <div class="walk-item">
          <span class="icon-chip round">${icons.heartPlus(18)}</span>
          <div><a href="${wwlLink()}"${ext(v.wellnessWithoutLimits)}>Explore Wellness Without Limits ${arrow(wwlLink())}</a><p>My heart project: a celebration of health, hope and wellness.</p></div>
        </div>
        <div class="walk-item">
          <span class="icon-chip round">${icons.book(18)}</span>
          <div><a href="/philanthropy#initiatives">Join Her Secret Place →</a><p>A women's retreat to rest, reflect and reconnect with faith.</p></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="ventures" class="section section-alt">
  <div class="wrap stack" style="gap: 56px">
    <div class="section-head-row">
      <div class="section-head">
        <span class="eyebrow">Our services</span>
        <h2 class="h2 reveal">Support shaped around <br><em class="s">your</em> life</h2>
      </div>
      <div class="stack" style="gap: 20px; max-width: 380px">
        <p style="font-size: 15px; line-height: 1.65">These are the spaces I pour my energy and heart into. From conversations that stretch us, to experiences that [COPY TO COME]</p>
        <a class="btn btn-primary" href="/about#ventures">See what I'm building</a>
      </div>
    </div>
    <div class="venture-grid">
      ${ventureCard({ n: '01', title: 'Her Secret Place', img: '/images/reading-journal.jpg', alt: 'Leya reading her Secret Place journal at a wooden table', pos: 'center 40%', text: 'A retreat for women to step away, rest and reconnect with faith.', href: '/philanthropy#initiatives' })}
      ${ventureCard({ n: '02', title: 'Wellness Without Limits', img: '/images/wwl-card.jpg', alt: 'A Wellness Without Limits card resting among fresh greens beside a woven basket', pos: 'center 45%', text: 'A celebration of health, hope and wellness. Bringing holistic, faith-rooted care to women, drawing on African wellness traditions.', href: wwlLink(), featured: true })}
      ${ventureCard({ n: '03', title: 'Arimah Travel and Tours', img: '/images/portrait-arimah-travel.jpg', alt: 'Leya in an Arimah Travel shirt, smiling with arms folded', pos: 'center 22%', text: copy.travelLine, href: v.arimahTravel })}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap stack" style="gap: 56px">
    <div class="section-head center">
      <span class="eyebrow">Get to know me</span>
      <h2 class="h2 reveal">The values I live by, <br><em class="s">every day</em></h2>
      <p class="lede" style="max-width: 520px; margin: 0 auto">Four things shape every venture I build, every room I walk into and every conversation at my kitchen table.</p>
    </div>
    <div class="values-grid">
      <div class="stack" style="gap: 20px">
        ${valueCard('01', icons.cross(20), 'Faith first', 'Faith is my compass. It steadies me on the hard days and keeps me humble on the good ones.')}
        ${valueCard('02', icons.target(20), 'Truth before growth', "Real growth starts when we're honest about where we are. I'd rather share the messy middle than a polished highlight reel.")}
      </div>
      <div class="video-card reveal">
        <img class="bg" src="/images/eyes-closed-sunlight.jpg" alt="" aria-hidden="true">
        <span class="video-len">Video · ${video.length}</span>
        ${video.url
          ? html`<a class="play" href="${video.url}" target="_blank" rel="noopener" aria-label="Play video: Leya on faith, family and purpose">${icons.play(22)}</a>`
          : html`<span class="play" aria-hidden="true">${icons.play(22)}</span>`}
        <div class="video-cap"><strong>Hear it from me</strong><span>Leya on faith, family and living with purpose</span></div>
      </div>
      <div class="stack" style="gap: 20px">
        ${valueCard('03', icons.hand(20), 'Service over status', "Success isn't the title on the door. It's how many people you've helped lift, nurture and restore along the way.")}
        ${valueCard('04', icons.heartSolid(20), 'Healing from within', 'Wellness is more than the body. Mind, spirit and family all need tending, and the work always starts on the inside.')}
      </div>
    </div>
  </div>
</section>

${latest.length > 0 && html`<section id="journal" class="section section-white">
  <div class="wrap stack" style="gap: 56px">
    <div class="section-head-row" style="gap: 24px">
      <div class="section-head">
        <span class="eyebrow">From the journal</span>
        <h2 class="h2 reveal">Notes for the <em class="s nowrap">in-between</em> days</h2>
      </div>
      <a class="btn btn-primary" href="/stories">All articles</a>
    </div>
    <div class="post-grid">${latest.map((p) => postCard(p, { meta: false }))}</div>
  </div>
</section>`}
</main>
${footer({ path: '/', nl })}`;

  return layout({
    path: '/',
    description: 'Leya Mnangagwa: faith-led wellness advocate, founder, mentor and mother of four. Honest reflections on faith, family and wellness.',
    image: '/images/hero-wildflower-field.jpg',
    scripts: ['/js/hero-slider.js'],
    body,
  });
}

function ventureCard({ n, title, img, alt, pos, text, href, featured }) {
  const external = href && href.startsWith('http');
  return html`<article class="venture-card${featured ? ' featured' : ''} reveal">
    <div class="venture-media"><span class="num">${n}</span><img src="${img}" alt="${alt}" loading="lazy" style="object-position: ${pos}"></div>
    <div class="venture-body">
      <h3>${title}</h3>
      <p>${text}</p>
      <a href="${link(href)}"${raw(external ? ' target="_blank" rel="noopener"' : '')}>Learn more<span aria-hidden="true">${external ? '↗' : '→'}</span></a>
    </div>
  </article>`;
}

function valueCard(n, icon, title, text) {
  return html`<article class="value-card">
    <div class="value-top"><span class="icon-chip">${icon}</span><span class="num">${n}</span></div>
    <h3>${title}</h3>
    <p>${text}</p>
  </article>`;
}

// ---------------------------------------------------------------- About
export function aboutPage({ nl }) {
  const { ventures: v, copy } = site;
  const body = html`
${hero({
  current: 'about',
  image: '/images/tree-sunset.jpg',
  pos: 'center 55%',
  label: 'A lone tree in a meadow at sunset, framed by mountains',
  body: html`
    <div>
      ${breadcrumb('About')}
      <h1 class="h1">Faith, family <br>and <em class="s">purpose</em></h1>
    </div>
    <div class="hero-meta">
      <p>Entrepreneur, founder, mentor and mother of four, building spaces where women can grow whole.</p>
      <div class="chips"><span class="chip">Faith-led</span><span class="chip">Wellness advocate</span><span class="chip">Founder</span></div>
    </div>`,
})}
<main id="main">
<section class="section">
  <div class="wrap split">
    <img class="photo reveal" src="/images/portrait-smiling-field.jpg" alt="Leya Mnangagwa smiling softly in a sunlit field" style="height: clamp(380px, 50vw, 560px); object-position: center 25%">
    <div class="stack">
      <span class="eyebrow">About me</span>
      <h2 class="h2 reveal" style="font-size: clamp(36px, 4.2vw, 56px); line-height: 1.06">Hi, I'm Leya. Living life <em class="s">in full colour</em></h2>
      <p class="prose-lg">I'm Leya Mnangagwa, a woman devoted to living life in full colour, guided by faith, purpose and grace.</p>
      <p class="prose-lg">I've worn many hats: entrepreneur, founder, mentor, dreamer. But above all, I'm a wife and mother of four who believes that growth begins with truth and healing starts from within. My journey has taught me that real success is found not in titles but in service, in using what we have to uplift, nurture and restore others.</p>
      <div class="btn-row" style="padding-top: 8px">
        <a class="btn btn-primary" href="#ventures">See what I'm building</a>
        <a class="btn btn-outline" href="/contact">Get in touch</a>
      </div>
    </div>
  </div>
</section>

<section id="ventures" class="section section-alt">
  <div class="wrap stack" style="gap: 56px">
    <div class="section-head center">
      <span class="eyebrow">What I'm building</span>
      <h2 class="h2 reveal">Spaces where women <br>can <em class="s">grow whole</em></h2>
      <p class="lede">My work blends African wellness, storytelling and faith-driven principles to help others live healthy, whole and grace-filled lives, with intention and balance across faith, family and purpose.</p>
    </div>
    <div class="card-grid">
      ${aboutVenture(icons.heartPlus(24), 'Wellness Without Limits', 'Holistic wellness for women, rooted in African wellness traditions and faith.', wwlLink(), v.wellnessWithoutLimits ? 'Visit site ↗' : 'Learn more →')}
      ${aboutVenture(icons.mic(24), 'The Unqualified Podcast', copy.podcastLine, v.podcast, 'Listen ↗')}
      ${aboutVenture(icons.globe(24), 'Arimah Travel &amp; Tours', copy.travelLine, v.arimahTravel, 'Visit site ↗')}
      ${aboutVenture(icons.house(24), 'The Arimah Foundation', copy.foundationLine, v.foundation || '/philanthropy#initiatives', 'Learn more →')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <img class="photo reveal" src="/images/kneeling-prayer.jpg" alt="Leya kneeling on grass with hands clasped in prayer" style="height: clamp(420px, 55vw, 620px); object-position: 70% center; background: var(--hero-dark)" loading="lazy">
    <div class="stack">
      <span class="eyebrow">What grounds me</span>
      <h2 class="h2 reveal">The moments that <br><em class="s">matter most</em></h2>
      <p class="lede">When I'm not working, you'll find me grounded in the things that remind me what truly counts.</p>
      <ol class="numbered-list">
        <li><span>Time with my family</span><span class="num">01</span></li>
        <li><span>Prayer</span><span class="num">02</span></li>
        <li><span>Reflection</span><span class="num">03</span></li>
        <li><span>Deep conversations</span><span class="num">04</span></li>
      </ol>
    </div>
  </div>
</section>

<section class="photo-band" style="padding: 140px 0">
  <img class="bg" src="/images/hero-wildflower-field.jpg" alt="" aria-hidden="true" style="object-position: 62% 40%" loading="lazy">
  <div class="shade" aria-hidden="true"></div>
  <div class="wrap stack center" style="max-width: 820px; gap: 28px">
    <span class="eyebrow light">If you've found your way here</span>
    <p class="serif reveal" style="font-size: clamp(30px, 3.8vw, 48px); line-height: 1.2">Welcome. May this space remind you that you are worthy of love, capable of growth, and <em class="s">exactly where you are meant to be.</em></p>
    <div class="btn-row" style="justify-content: center; padding-top: 8px">
      <a class="btn btn-light" href="/stories">Read the journal</a>
      <a class="btn btn-outline-light" href="/contact">Get in touch</a>
    </div>
  </div>
</section>
</main>
${footer({ path: '/about', nl })}`;

  return layout({
    title: 'About',
    path: '/about',
    description: 'Entrepreneur, founder, mentor and mother of four, building spaces where women can grow whole.',
    image: '/images/portrait-smiling-field.jpg',
    body,
  });
}

function aboutVenture(icon, title, text, href, cta) {
  const external = href && href.startsWith('http');
  return html`<article class="card lift reveal">
    <span class="icon-chip lg">${icon}</span>
    <h3>${raw(title)}</h3>
    <p>${text}</p>
    <a class="card-link" href="${link(href)}"${raw(external ? ' target="_blank" rel="noopener"' : '')}>${cta}</a>
  </article>`;
}

// ---------------------------------------------------------------- Philanthropy
export function philanthropyPage({ nl }) {
  const { ventures: v, copy, stats } = site;
  const donate = site.donateUrl;
  const body = html`
${hero({
  current: 'philanthropy',
  image: '/images/kneeling-prayer.jpg',
  pos: 'center 45%',
  minHeight: 640,
  label: 'Leya kneeling on grass with hands clasped in prayer',
  body: html`
    <div>
      ${breadcrumb('Philanthropy')}
      <h1 class="h1">Using what we have <br>to <em class="s">lift others</em></h1>
    </div>
    <div class="hero-meta">
      <p>Through the Arimah Foundation and Wellness Without Limits, Leya builds spaces where women and families can heal, grow and thrive.</p>
      <a class="btn btn-light" href="#give">Get involved</a>
    </div>`,
})}
<main id="main">
<section class="section">
  <div class="wrap split">
    <div class="stack">
      <span class="eyebrow">Why I give</span>
      <h2 class="h2 reveal">Success is measured <em class="s">in service</em></h2>
      <p class="prose-lg">I've learned that real success isn't found in titles. It's found in what we do with what we've been given: how we uplift, nurture and restore the people around us.</p>
      <p class="prose-lg">My giving grows from the same place as everything else I do: faith, family and a belief that healing starts from within. I want every woman to know she is worthy of love, capable of growth and never on her own.</p>
      <span class="serif" style="font-style: italic; font-size: 26px; color: var(--primary-ink)">— Leya</span>
    </div>
    <img class="photo reveal" src="/images/self-hug-sunlight.jpg" alt="Leya hugging herself, eyes closed, face turned toward the sun" style="height: clamp(420px, 55vw, 600px); object-position: center 22%">
  </div>
</section>

<section id="initiatives" class="section section-alt">
  <div class="wrap stack" style="gap: 56px">
    <div class="section-head-row" style="gap: 24px">
      <div class="section-head" style="max-width: 640px">
        <span class="eyebrow">Initiatives</span>
        <h2 class="h2 reveal">Where the work <em class="s">happens</em></h2>
      </div>
      <p class="lede" style="max-width: 380px">Each initiative meets a different need, but they share one goal: whole, healthy, grace-filled lives.</p>
    </div>
    <div class="initiative-grid">
      ${initiative({ img: '/images/garden-pergola.jpg', alt: 'A quiet garden path under a vine-covered pergola', label: 'Foundation', title: 'The Arimah Foundation', text: copy.foundationMission, href: v.foundation, cta: 'About the foundation →' })}
      ${initiative({ id: 'wellness-without-limits', img: '/images/wwl-card.jpg', alt: 'A Wellness Without Limits card among fresh greens', pos: 'center 45%', label: 'My heart project', title: 'Wellness Without Limits', text: 'A celebration of health, hope and wellness. Bringing holistic, faith-rooted care to women, drawing on African wellness traditions.', href: v.wellnessWithoutLimits, cta: v.wellnessWithoutLimits && 'Visit Wellness Without Limits ↗' })}
      ${initiative({ img: '/images/reading-journal.jpg', alt: 'Leya reading her journal', pos: 'center 45%', label: 'Retreat', title: 'Her Secret Place', text: `A retreat for women to step away, rest and reconnect with faith. ${copy.retreatDetails}`, href: v.herSecretPlace, cta: 'Learn about the retreat →' })}
      ${initiative({ img: '/images/eyes-closed-sunlight.jpg', alt: 'Leya with eyes closed in warm sunlight', pos: 'center 28%', label: 'Podcast', title: 'The Unqualified Podcast', text: "Honest conversations for anyone who has ever been made to feel they aren't enough. Free to listen, wherever you are.", href: v.podcast, cta: 'Listen now ↗' })}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap stack" style="gap: 64px">
    <div class="section-head center" style="max-width: 680px">
      <span class="eyebrow">Where we focus</span>
      <h2 class="h2 reveal">Three causes <em class="s">close to home</em></h2>
    </div>
    <div class="focus-grid">
      <div><span class="num">01</span><h3>Women's wellness</h3><p>Mind, body and spirit, cared for together. Practical support that meets women where they are.</p></div>
      <div><span class="num">02</span><h3>Strong families</h3><p>Healthy homes start with healthy parents. Helping families find balance between faith, work and each other.</p></div>
      <div><span class="num">03</span><h3>Faith &amp; community</h3><p>Creating spaces of belonging, where people can gather, pray, share stories and lift one another up.</p></div>
    </div>
    <div class="impact reveal">
      <div><strong>${stats.womenReached}+</strong><span>Women reached</span></div>
      <div><strong>${stats.retreatsHeld}</strong><span>Retreats &amp; events held</span></div>
      <div><strong>${stats.communitiesServed}</strong><span>Communities served</span></div>
      <div><strong>${stats.podcastEpisodes}</strong><span>Podcast episodes</span></div>
    </div>
  </div>
</section>

<section id="give" class="photo-band section">
  <img class="bg" src="/images/hero-wildflower-field.jpg" alt="" aria-hidden="true" style="object-position: 62% 40%" loading="lazy">
  <div class="shade" aria-hidden="true" style="--shade: 0.62"></div>
  <div class="wrap stack" style="gap: 48px">
    <div class="section-head center" style="max-width: 680px">
      <span class="eyebrow light">Get involved</span>
      <h2 class="h2 reveal">There's a place for you <em class="s">in this work</em></h2>
    </div>
    <div class="card-grid" style="--min: 280px">
      <article class="glass-card reveal">
        <h3>Give</h3>
        <p>Every gift helps fund retreats, wellness programmes and support for families.</p>
        ${donate
          ? html`<a class="btn btn-light" href="${donate}" target="_blank" rel="noopener">Donate</a>`
          : html`<a class="btn btn-light" href="/contact?topic=${encodeURIComponent('Arimah Foundation')}#form">Donate</a>`}
      </article>
      <article class="glass-card reveal">
        <h3>Volunteer</h3>
        <p>Share your time and skills at events, retreats and community outreach.</p>
        <a class="btn btn-outline-light" href="/contact?topic=${encodeURIComponent('Arimah Foundation')}#form">Join the team</a>
      </article>
      <article class="glass-card reveal">
        <h3>Partner</h3>
        <p>Organisations, churches and businesses can sponsor programmes or co-host events.</p>
        <a class="btn btn-outline-light" href="/contact#form">Start a conversation</a>
      </article>
    </div>
  </div>
</section>
</main>
${footer({ path: '/philanthropy', nl, blurb: 'Reflections on wellness, faith and family, plus news from the foundation.' })}`;

  return layout({
    title: 'Philanthropy',
    path: '/philanthropy',
    description: 'Through the Arimah Foundation and Wellness Without Limits, Leya builds spaces where women and families can heal, grow and thrive.',
    image: '/images/kneeling-prayer.jpg',
    body,
  });
}

function initiative({ id, img, alt, pos = 'center', label, title, text, href, cta }) {
  const external = href && href.startsWith('http');
  return html`<article class="initiative reveal"${raw(id ? ` id="${id}"` : '')}>
    <div class="initiative-media"><img src="${img}" alt="${alt}" loading="lazy" style="object-position: ${pos}"></div>
    <div class="initiative-body">
      <span class="label">${label}</span>
      <h3>${title}</h3>
      <p>${text}</p>
      ${cta && html`<a href="${link(href)}"${raw(external ? ' target="_blank" rel="noopener"' : '')}>${cta}</a>`}
    </div>
  </article>`;
}

// ---------------------------------------------------------------- Contact
export function contactPage({ sent, errors = [], values = {}, nl }) {
  const c = site.contact;
  const s = site.social;
  const topic = values.topic || '';
  const body = html`
${hero({
  current: 'contact',
  image: '/images/garden-pergola.jpg',
  pos: 'center 60%',
  minHeight: 520,
  label: 'A quiet garden path under a vine-covered pergola',
  body: html`
    <div>
      ${breadcrumb('Contact')}
      <h1 class="h1">Let's <em class="s">talk</em></h1>
      <p style="max-width: 460px; font-size: 15px; line-height: 1.6">Speaking, mentorship, partnerships or just a hello. Every message is read personally.</p>
    </div>`,
})}
<main id="main">
<section id="form" class="section" style="padding-top: 96px">
  <div class="wrap contact-grid">
    <div class="stack" style="gap: 32px">
      <div class="section-head">
        <span class="eyebrow">Get in touch</span>
        <h2 class="h2" style="font-size: clamp(32px, 3.6vw, 46px)">I'd love to <em class="s">hear from you</em></h2>
        <p class="lede">Tell me a little about what you have in mind. I usually reply within ${c.replyDays} working days.</p>
      </div>
      <div class="contact-list">
        <a href="${c.email.startsWith('[') ? '#' : 'mailto:' + c.email}"><span class="icon-chip round">${icons.mail(20)}</span><span><small>Email</small>${c.email}</span></a>
        <a href="${c.phone.startsWith('[') ? '#' : 'tel:' + c.phone.replace(/[^+\d]/g, '')}"><span class="icon-chip round">${icons.phone(20)}</span><span><small>Phone / WhatsApp</small>${c.phone}</span></a>
        <div><span class="icon-chip round">${icons.pin(20)}</span><span><small>Based in</small>${c.location}</span></div>
      </div>
      <div class="stack" style="gap: 12px">
        <span style="font-size: 13px; color: var(--muted-2)">Follow along</span>
        <div class="socials">
          <a href="${link(s.instagram)}" aria-label="Instagram">${icons.instagram(18)}</a>
          <a href="${link(s.facebook)}" aria-label="Facebook">${icons.facebook(18)}</a>
          <a href="${link(s.linkedin)}" aria-label="LinkedIn">${icons.linkedin(18)}</a>
          <a href="${link(s.youtube)}" aria-label="YouTube">${icons.youtube(18)}</a>
        </div>
      </div>
    </div>

    <div class="form-card">
      ${sent
        ? html`<div class="thanks" role="status">
            <span class="big-check" style="color: var(--primary-ink)">${icons.check(26)}</span>
            <h3>Thank you</h3>
            <p>Your message is on its way. I'll be in touch soon.</p>
            <a class="btn btn-outline" style="align-self: center" href="/contact#form">Send another</a>
          </div>`
        : html`<form class="form-grid" method="post" action="/contact" novalidate>
            ${errors.length > 0 && html`<div class="form-error full" role="alert">${errors.map((e) => html`${e} <br>`)}</div>`}
            <label class="field">Your name<input name="name" type="text" required autocomplete="name" placeholder="Full name" value="${values.name}"></label>
            <label class="field">Email<input name="email" type="email" required autocomplete="email" placeholder="you@email.com" value="${values.email}"></label>
            <label class="field full">What's it about?
              <select name="topic">${site.contactTopics.map((t) => html`<option${raw(t === topic ? ' selected' : '')}>${t}</option>`)}</select>
            </label>
            <label class="field full">Your message<textarea name="message" rows="6" required placeholder="Share as much or as little as you like">${values.message}</textarea></label>
            <span class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></span>
            <label class="check full"><input type="checkbox" name="newsletter" value="1"${raw(values.newsletter ? ' checked' : '')}>Keep me updated with the monthly newsletter (optional)</label>
            <button class="btn btn-primary full" type="submit" style="min-height: 48px; padding: 0 30px; font-size: 15px">Send message</button>
          </form>`}
    </div>
  </div>
</section>
</main>
${footer({ path: '/contact', nl })}`;

  return layout({
    title: 'Contact',
    path: '/contact',
    description: 'Speaking, mentorship, partnerships or just a hello. Every message is read personally.',
    body,
  });
}

// ---------------------------------------------------------------- Stories (journal)
export function journalPage({ posts, topic, page, pages, nl }) {
  const topics = ['All', ...site.categories];
  const pageHref = (n) => {
    const q = new URLSearchParams();
    if (topic) q.set('topic', topic);
    if (n > 1) q.set('page', n);
    const s = q.toString();
    return '/stories' + (s ? '?' + s : '') + '#articles';
  };
  const body = html`
${barHeader('stories')}
<main id="main">
<section class="wrap journal-intro">
  <div class="section-head" style="max-width: 640px">
    <span class="eyebrow">The journal</span>
    <h1 class="h1" style="font-size: clamp(42px, 5.5vw, 72px)">Notes for the <em class="s nowrap">in-between</em> days</h1>
  </div>
  <p class="lede" style="max-width: 380px">Practical ideas and honest reflections. Short reads, written for real life.</p>
</section>

<section id="articles" class="section-white" style="padding: 80px 0 104px">
  <div class="wrap stack" style="gap: 48px">
    <div class="section-head-row" style="align-items: center; gap: 20px">
      <h2 style="font-size: clamp(28px, 3vw, 38px); font-weight: 400; letter-spacing: -0.025em">${topic ? topic : html`Latest <em class="s">articles</em>`}</h2>
      <nav class="filters" aria-label="Filter by topic">
        ${topics.map((t) => {
          const on = (t === 'All' && !topic) || t === topic;
          const href = t === 'All' ? '/stories#articles' : `/stories?topic=${encodeURIComponent(t)}#articles`;
          return html`<a class="filter" href="${href}"${raw(on ? ' aria-current="true"' : '')}>${t}</a>`;
        })}
      </nav>
    </div>

    ${posts.length > 0
      ? html`<div class="post-grid">${posts.map((p) => postCard(p))}</div>`
      : html`<p class="empty">No articles in this topic yet. Check back soon.</p>`}

    ${pages > 1 && html`<nav class="pagination" aria-label="Pagination">
      ${page > 1 ? html`<a href="${pageHref(page - 1)}">← Previous</a>` : ''}
      ${Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
        n === page ? html`<span aria-current="page">${n}</span>` : html`<a href="${pageHref(n)}">${n}</a>`)}
      ${page < pages ? html`<a href="${pageHref(page + 1)}">Next →</a>` : ''}
    </nav>`}
  </div>
</section>
</main>
${footer({ path: '/stories', nl })}`;

  return layout({
    title: topic ? `${topic} stories` : 'Stories',
    path: '/stories' + (topic ? `?topic=${encodeURIComponent(topic)}` : ''),
    description: 'Honest reflections on faith, family and wellness. Short reads, written for real life.',
    body,
  });
}

// ---------------------------------------------------------------- Article
export function articlePage({ post: p, more, preview, nl }) {
  const { copy } = site;
  const url = `${site.url}/stories/${p.slug}`;
  const share = encodeURIComponent(url);
  const author = p.author || '[Author name]';
  const body = html`
${barHeader('stories')}
${preview && html`<div class="preview-bar" role="status">Preview · this post is <strong>${p.status.toLowerCase()}</strong>${p.status === 'Scheduled' ? ` for ${formatDate(p.date)}` : ''} and not visible to the public. <a href="/admin">Back to admin</a></div>`}
<main id="main">
<section class="wrap-narrow article-head">
  <a class="back" href="/stories">← Back to the journal</a>
  <a class="tag" href="/stories?topic=${encodeURIComponent(p.category)}" style="padding: 8px 22px; font-size: 13px">${p.category}</a>
  <h1>${p.title || 'Untitled post'}</h1>
  ${p.excerpt && html`<p class="standfirst">${p.excerpt}</p>`}
  <div class="byline">
    <span class="avatar" aria-hidden="true"></span>
    <span class="stack" style="gap: 2px"><strong>${author}</strong><small>${copy.authorRole}</small></span>
    <span class="dot lead" aria-hidden="true">·</span>
    <span class="when">${p.date ? html`<time datetime="${p.date}">${formatDate(p.date)}</time>` : '[Date]'}<span class="dot" aria-hidden="true">·</span>${readMinutes(p.body)} min read</span>
  </div>
</section>

${p.image && html`<figure class="article-hero"><img src="${p.image}" alt="${p.imageAlt}"></figure>`}

<article class="prose">
  ${p.body.trim() ? renderMarkdown(p.body) : html`<p>[Article body]</p>`}

  <div class="article-foot">
    <div class="filters" style="font-size: 13px"><a class="pill-tag" href="/stories?topic=${encodeURIComponent(p.category)}">${p.category}</a></div>
    <div class="share">Share
      <a href="https://www.facebook.com/sharer/sharer.php?u=${share}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icons.facebook(14)}</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${share}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icons.linkedin(14)}</a>
      <button type="button" data-copy="${url}" aria-label="Copy link">${icons.link(14)}</button>
      <span class="copied" role="status" aria-live="polite"></span>
    </div>
  </div>

  <div class="author-box">
    <span class="avatar" aria-hidden="true"></span>
    <div class="stack" style="flex: 1 1 240px; gap: 8px">
      <span class="eyebrow">Written by</span>
      <strong>${author}</strong>
      <p>${copy.authorBio}</p>
      <a href="/about">View profile →</a>
    </div>
  </div>
</article>
</main>

${more.length > 0 && html`<section class="wrap on-page" style="max-width: 1100px; padding-top: 96px; padding-bottom: 96px">
  <div class="stack" style="gap: 40px">
    <h2 style="font-size: clamp(30px, 3.4vw, 44px); line-height: 1.1; font-weight: 400; letter-spacing: -0.025em">Keep <em class="s">reading</em></h2>
    <div class="post-grid" style="gap: 40px">${more.map((m) => postCard(m, { excerpt: false, meta: false }))}</div>
  </div>
</section>`}
${footer({ path: `/stories/${p.slug}`, nl })}`;

  return layout({
    title: p.title || 'Untitled post',
    path: `/stories/${p.slug}`,
    description: p.excerpt,
    image: p.image,
    robots: preview ? 'noindex' : undefined,
    scripts: ['/js/article.js'],
    body,
  });
}

// ---------------------------------------------------------------- Simple pages
export function simplePage({ title, path, heading, children, nl, status }) {
  const body = html`
${barHeader('')}
<main id="main" class="wrap-narrow" style="padding-top: 96px; padding-bottom: 120px">
  <div class="stack" style="gap: 24px">
    <span class="eyebrow">${site.name}</span>
    <h1 class="h1" style="font-size: clamp(40px, 5vw, 64px)">${heading}</h1>
    ${children}
  </div>
</main>
${footer({ path, nl })}`;
  return layout({ title, path, body, robots: status === 404 ? 'noindex' : undefined });
}

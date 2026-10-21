import { html, raw, formatDate } from './html.js';
import { site } from '../site.js';
import { EXCERPT_MAX } from '../store.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap';

const svg = (body) => raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${body}</svg>`);
const NAV = [
  { key: 'posts', href: '/admin', label: 'Blog posts', icon: svg('<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>') },
  { key: 'messages', href: '/admin/messages', label: 'Messages', icon: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>') },
  { key: 'subscribers', href: '/admin/subscribers', label: 'Subscribers', icon: svg('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.8-3.5 3.3-5 6-5s5.2 1.5 6 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c1.6.6 2.6 2.2 3 5"/>') },
  { key: 'import', href: '/admin/import', label: 'Import', icon: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>') },
];

function doc({ title, body, csrf, scripts = [] }) {
  return '<!doctype html>' + html`
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${csrf && html`<meta name="csrf-token" content="${csrf}">`}
<title>${title} · ${site.name} Admin</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/admin.css">
</head>
<body>
${body}
${scripts.map((s) => html`<script src="${s}" defer></script>`)}
</body>
</html>`;
}

function shell({ active, title, csrf, unread = 0, main, scripts }) {
  const body = html`<div class="admin">
  <aside class="sidebar">
    <div class="brand"><em class="s">${site.name}</em><span>Admin</span></div>
    <nav aria-label="Admin">
      ${NAV.map((n) => html`<a href="${n.href}"${raw(n.key === active ? ' aria-current="page"' : '')}>${n.icon}${n.label}${n.key === 'messages' && unread > 0 ? html`<span class="badge" aria-label="${unread} unread">${unread}</span>` : ''}</a>`)}
    </nav>
    <div class="me">
      <span class="avatar" aria-hidden="true"></span>
      <span class="stack"><strong>${site.owner}</strong><a href="/" target="_blank" rel="noopener">View site ↗</a></span>
      <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit" class="link-btn">Log out</button></form>
    </div>
  </aside>
  <main class="admin-main" id="main">${main}</main>
</div>`;
  return doc({ title, body, csrf, scripts });
}

export function loginPage({ error, disabled }) {
  const body = html`<main class="login">
  <form class="login-card" method="post" action="/admin/login">
    <div class="brand dark"><em class="s">${site.name}</em><span>Admin</span></div>
    <h1>Welcome <em class="s">back</em></h1>
    ${disabled
      ? html`<p class="hint">The admin area is switched off. Set the <code>ADMIN_PASSWORD</code> environment variable and restart the server to turn it on.</p>`
      : html`
        ${error && html`<div class="alert" role="alert">${error}</div>`}
        <label class="field">Password<input type="password" name="password" required autofocus autocomplete="current-password"></label>
        <button class="btn primary" type="submit">Log in</button>`}
    <a class="back" href="/">← Back to the site</a>
  </form>
</main>`;
  return doc({ title: 'Log in', body });
}

export function postsPage({ csrf, posts, unread, today }) {
  const boot = JSON.stringify({ posts, categories: site.categories, today, excerptMax: EXCERPT_MAX, siteUrl: site.url })
    .replace(/</g, '\\u003c');
  const tool = (cmd, label, inner, extra = '') => html`<button type="button" data-cmd="${cmd}" aria-label="${label}" title="${label}"${raw(extra)}>${inner}</button>`;
  const sv = (b) => raw(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${b}</svg>`);
  const main = html`
  <div class="topbar">
    <div class="stack" style="gap: 4px">
      <h1>Blog <em class="s">posts</em></h1>
      <span class="sub" id="count-label"></span>
    </div>
    <div class="actions">
      <label class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <span class="sr-only">Search posts</span>
        <input type="search" id="search" placeholder="Search posts">
      </label>
      <button type="button" class="btn primary" id="new-post"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New post</button>
    </div>
  </div>

  <div role="tablist" aria-label="Filter by status" class="tabs" id="tabs"></div>

  <div class="panes" id="panes">
    <section aria-label="Posts" class="post-list" id="post-list"></section>

    <section aria-label="Edit post" class="editor" id="editor" hidden>
      <button type="button" class="back-to-list" id="back-to-list">← All posts</button>
      <div class="editor-head">
        <div class="editing">Editing <span class="pill" id="cur-status"></span><span class="unsaved" id="unsaved" hidden>Unsaved changes</span></div>
        <div class="editor-actions">
          <a class="btn" id="preview" href="#" target="_blank" rel="noopener">Preview</a>
          <button type="button" class="btn" id="save-draft">Save draft</button>
          <button type="button" class="btn primary" id="publish">Publish</button>
        </div>
      </div>

      <div role="status" class="toast" id="toast" hidden></div>

      <label class="field">Title
        <textarea id="f-title" class="title-input" rows="1" placeholder="Post title"></textarea>
      </label>
      <span class="slug" id="slug"></span>

      <div class="field-row">
        <label class="field">Category
          <select id="f-category">${site.categories.map((c) => html`<option>${c}</option>`)}</select>
        </label>
        <label class="field">Author
          <input type="text" id="f-author" placeholder="[Author name]">
        </label>
        <label class="field">Publish date
          <input type="date" id="f-date">
        </label>
      </div>

      <div class="field">
        <span>Featured image</span>
        <div class="image-box">
          <img id="f-image-preview" alt="Featured image preview">
          <div class="stack" style="gap: 8px; flex: 1 1 200px">
            <span class="hint">JPG or PNG, at least 1600px wide, under 4MB</span>
            <div class="btn-row">
              <label class="btn small">Replace<input type="file" id="f-image-file" accept="image/jpeg,image/png,image/webp" class="sr-only"></label>
              <button type="button" class="btn small danger-text" id="f-image-remove">Remove</button>
            </div>
            <label class="field compact">Image description <span class="hint">for screen readers</span>
              <input type="text" id="f-image-alt" placeholder="Describe the photo">
            </label>
          </div>
        </div>
      </div>

      <label class="field">Excerpt <span class="hint">Shown on blog cards. <span id="excerpt-count">0</span> / ${EXCERPT_MAX}</span>
        <textarea id="f-excerpt" rows="3" maxlength="${EXCERPT_MAX}"></textarea>
      </label>

      <div class="field">
        <span id="body-label">Article <span class="hint">Markdown: ## heading, **bold**, *italic*, > quote</span></span>
        <div class="body-box">
          <div role="toolbar" aria-label="Formatting" class="toolbar">
            ${tool('bold', 'Bold', raw('<b>B</b>'))}
            ${tool('italic', 'Italic', raw('<i>I</i>'))}
            ${tool('heading', 'Heading', raw('<span style="font-size: 13px; font-weight: 600">H2</span>'))}
            ${tool('quote', 'Quote', sv('<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>'))}
            ${tool('list', 'Bulleted list', sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'))}
            ${tool('link', 'Link', sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'))}
            ${tool('image', 'Insert image', sv('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>'))}
            <input type="file" id="body-image-file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1">
          </div>
          <textarea id="f-body" rows="16" aria-labelledby="body-label"></textarea>
        </div>
        <span class="hint" id="word-count"></span>
      </div>

      <div class="editor-foot">
        <button type="button" class="link-btn danger-text" id="delete">Delete this post</button>
      </div>
    </section>
  </div>
  <script type="application/json" id="boot">${raw(boot)}</script>`;
  return shell({ active: 'posts', title: 'Blog posts', csrf, unread, main, scripts: ['/js/admin.js'] });
}

export function messagesPage({ csrf, messages, unread, mailOn }) {
  const main = html`
  <div class="topbar">
    <div class="stack" style="gap: 4px">
      <h1>Messages</h1>
      <span class="sub">${messages.length} total · ${unread} unread</span>
    </div>
  </div>
  ${!mailOn && html`<div class="notice">Email forwarding is off, so contact-form messages only appear here. Set <code>CONTACT_TO</code> and the SMTP settings to have them sent to your inbox too.</div>`}
  ${messages.length === 0
    ? html`<p class="empty-card">No messages yet. Anything sent through the contact form shows up here.</p>`
    : html`<div class="msg-list">${messages.map((m) => html`
      <article class="msg${m.read ? '' : ' unread'}">
        <header>
          <div class="stack" style="gap: 2px">
            <strong>${m.name}</strong>
            <a href="mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.topic)}">${m.email}</a>
          </div>
          <div class="msg-meta"><span class="pill">${m.topic}</span>${m.newsletter ? html`<span class="pill pub">Newsletter opt-in</span>` : ''}<time datetime="${m.receivedAt}">${formatDate(m.receivedAt.slice(0, 10))}</time></div>
        </header>
        <p>${m.message}</p>
        <footer>
          <a class="btn small" href="mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.topic)}">Reply</a>
          <form method="post" action="/admin/messages/${m.id}/${m.read ? 'unread' : 'read'}"><input type="hidden" name="_csrf" value="${csrf}"><button class="btn small" type="submit">Mark as ${m.read ? 'unread' : 'read'}</button></form>
          <form method="post" action="/admin/messages/${m.id}/delete" data-confirm="Delete this message for good?"><input type="hidden" name="_csrf" value="${csrf}"><button class="link-btn danger-text" type="submit">Delete</button></form>
        </footer>
      </article>`)}</div>`}`;
  return shell({ active: 'messages', title: 'Messages', csrf, unread, main, scripts: ['/js/admin-confirm.js'] });
}

export function subscribersPage({ csrf, subscribers, unread }) {
  const main = html`
  <div class="topbar">
    <div class="stack" style="gap: 4px">
      <h1>Subscribers</h1>
      <span class="sub">${subscribers.length} on the newsletter list</span>
    </div>
    ${subscribers.length > 0 && html`<a class="btn primary" href="/admin/subscribers.csv">Download CSV</a>`}
  </div>
  <div class="notice">Import the CSV into your newsletter tool (Mailchimp, Kit, Buttondown...) to send the monthly email.</div>
  ${subscribers.length === 0
    ? html`<p class="empty-card">No subscribers yet. Sign-ups from the footer form and the contact form opt-in land here.</p>`
    : html`<div class="table-card"><table>
        <thead><tr><th scope="col">Email</th><th scope="col">Signed up from</th><th scope="col">Date</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${subscribers.map((s) => html`<tr>
          <td>${s.email}</td><td>${s.source}</td><td>${formatDate(s.subscribedAt.slice(0, 10))}</td>
          <td><form method="post" action="/admin/subscribers/delete" data-confirm="Remove ${s.email} from the list?"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="email" value="${s.email}"><button class="link-btn danger-text" type="submit">Remove</button></form></td>
        </tr>`)}</tbody>
      </table></div>`}`;
  return shell({ active: 'subscribers', title: 'Subscribers', csrf, unread, main, scripts: ['/js/admin-confirm.js'] });
}

export function importPage({ csrf, unread }) {
  const boot = JSON.stringify({ categories: site.categories }).replace(/</g, '\\u003c');
  const main = html`
  <div class="topbar">
    <div class="stack" style="gap: 4px">
      <h1>Import from <em class="s">WordPress</em></h1>
      <span class="sub">Bring existing posts over, with their images. Nothing is saved until you choose which posts to import.</span>
    </div>
  </div>

  <section class="import-card" id="step-source" aria-labelledby="source-h">
    <h2 id="source-h"><span class="step">1</span>Where are the posts?</h2>
    <div role="tablist" aria-label="Import source" class="tabs" id="source-tabs">
      <button type="button" role="tab" aria-selected="true" aria-controls="from-site" id="tab-site">From a WordPress site</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="from-file" id="tab-file">From an export file</button>
    </div>

    <form id="from-site" role="tabpanel" aria-labelledby="tab-site" class="stack" style="gap: 14px">
      <label class="field">Site address
        <input type="text" id="site-url" inputmode="url" autocomplete="url" placeholder="e.g. myblog.com or myblog.wordpress.com" required>
      </label>
      <p class="hint">Brings over published posts. For drafts, or if the site is private, use an export file instead.</p>
      <button type="submit" class="btn primary" id="find-posts" style="align-self: flex-start">Find posts</button>
    </form>

    <div id="from-file" role="tabpanel" aria-labelledby="tab-file" class="stack" style="gap: 14px" hidden>
      <label class="dropzone" id="dropzone">
        <input type="file" id="wxr-file" accept=".xml,text/xml,application/xml" class="sr-only">
        <strong>Choose your WordPress export file</strong>
        <span class="hint">or drop it here (.xml)</span>
      </label>
      <p class="hint">In WordPress, go to <strong>Tools → Export</strong>, pick <strong>Posts</strong> and click <strong>Download Export File</strong>. Includes drafts and scheduled posts.</p>
    </div>

    <div role="status" class="toast" id="source-status" hidden></div>
  </section>

  <section class="import-card" id="step-pick" aria-labelledby="pick-h" hidden>
    <h2 id="pick-h"><span class="step">2</span>Choose posts <span class="sub" id="found-label"></span></h2>

    <div class="import-options">
      <label class="field">Category for posts that don't match one here
        <select id="default-category">${site.categories.map((c) => html`<option>${c}</option>`)}</select>
      </label>
      <label class="check"><input type="checkbox" id="as-drafts" checked> Import as drafts, so I can review them before they go live</label>
      <label class="check"><input type="checkbox" id="copy-images" checked> Copy images to this site (recommended, so they keep working if the old site closes)</label>
    </div>

    <div class="pick-head">
      <label class="check"><input type="checkbox" id="select-all" checked> <span id="select-label">Select all</span></label>
    </div>
    <div class="pick-list" id="pick-list"></div>

    <div class="pick-foot">
      <button type="button" class="btn primary" id="start-import">Import posts</button>
      <button type="button" class="link-btn" id="start-over">Start over</button>
    </div>
  </section>

  <section class="import-card" id="step-run" aria-labelledby="run-h" hidden>
    <h2 id="run-h"><span class="step">3</span><span id="run-title">Importing…</span></h2>
    <div class="progress" role="progressbar" aria-labelledby="run-h" aria-valuemin="0" id="progress"><span id="progress-bar"></span></div>
    <p class="sub" id="progress-label" aria-live="polite"></p>
    <ul class="results" id="results"></ul>
    <div class="pick-foot" id="run-done" hidden>
      <a class="btn primary" href="/admin">Go to blog posts</a>
      <button type="button" class="link-btn" id="import-more">Import more</button>
    </div>
  </section>
  <script type="application/json" id="boot">${raw(boot)}</script>`;
  return shell({ active: 'import', title: 'Import from WordPress', csrf, unread, main, scripts: ['/js/admin-import.js'] });
}

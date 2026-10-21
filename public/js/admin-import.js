// WordPress import screen. Posts come from a live site (fetched page by page
// through this server) or an export file (parsed here in the browser), get
// listed for review, then import one at a time.
(() => {
  const boot = JSON.parse(document.getElementById('boot').textContent);
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const $ = (id) => document.getElementById(id);

  const state = { posts: [], siteUrl: '', existing: { slugs: new Set(), urls: new Set() }, running: false, stop: false };

  // Same rules as the server, so the preview matches what gets saved.
  const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled-post';
  const cleanSlug = (slug, title) => {
    let s = slug || '';
    try { s = decodeURIComponent(s); } catch {}
    return slugify(s || title);
  };
  const ours = new Map(boot.categories.map((c) => [c.toLowerCase(), c]));
  const mapCategory = (names) => names.map((n) => ours.get(String(n).trim().toLowerCase())).find(Boolean) || $('default-category').value;
  const STATUS_LABEL = { publish: 'Published', future: 'Scheduled', draft: 'Draft', pending: 'Pending review', private: 'Private' };
  const fmtDate = (d) => (d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'No date');

  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v != null && v !== false) n.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null && kid !== false) n.append(kid);
    return n;
  }

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { 'X-CSRF-Token': csrf, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Something went wrong (${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function status(msg, isErr = false) {
    const s = $('source-status');
    s.hidden = !msg;
    s.className = 'toast' + (isErr ? ' err' : '');
    s.textContent = msg || '';
  }

  // ---------- Source tabs
  function showTab(which) {
    $('tab-site').setAttribute('aria-selected', String(which === 'site'));
    $('tab-file').setAttribute('aria-selected', String(which === 'file'));
    $('from-site').hidden = which !== 'site';
    $('from-file').hidden = which !== 'file';
    status('');
  }
  $('tab-site').addEventListener('click', () => showTab('site'));
  $('tab-file').addEventListener('click', () => showTab('file'));

  async function loadExisting() {
    const { posts } = await api('GET', '/admin/api/posts');
    state.existing = {
      slugs: new Set(posts.map((p) => p.slug)),
      urls: new Set(posts.map((p) => p.source?.url).filter(Boolean)),
    };
  }

  // ---------- From a live site
  $('from-site').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('site-url').value.trim();
    if (!url) return $('site-url').focus();
    const btn = $('find-posts');
    btn.disabled = true;
    status('Looking for WordPress at that address…');
    try {
      await loadExisting();
      const posts = [];
      let page = 1;
      let endpoint;
      let total = 0;
      for (;;) {
        const q = new URLSearchParams({ url, page: String(page) });
        if (endpoint) q.set('endpoint', endpoint);
        const r = await api('GET', `/admin/api/import/site?${q}`);
        endpoint = r.endpoint;
        total = r.total || total;
        posts.push(...r.posts);
        status(`Loading posts… ${posts.length}${total ? ` of ${total}` : ''}`);
        if (!r.posts.length || page >= r.totalPages) break;
        page += 1;
      }
      if (!posts.length) throw new Error('That WordPress site has no published posts to import.');
      state.siteUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      showPicker(posts, `from ${new URL(state.siteUrl).hostname}`);
      status('');
    } catch (err) {
      status(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- From an export file (WXR)
  const kids = (node, name) => Array.from(node.children).filter((c) => c.nodeName === name);
  const one = (node, name) => kids(node, name)[0]?.textContent ?? '';

  function parseWxr(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('That file isn’t a valid WordPress export. It should be the .xml file from Tools → Export.');
    const channel = doc.getElementsByTagName('channel')[0];
    if (!channel || !kids(channel, 'wp:wxr_version').length) throw new Error('That file isn’t a WordPress export. It should be the .xml file from Tools → Export.');

    const authors = new Map(kids(channel, 'wp:author').map((a) => [one(a, 'wp:author_login'), one(a, 'wp:author_display_name') || one(a, 'wp:author_login')]));
    const items = kids(channel, 'item');
    const meta = (item) => Object.fromEntries(kids(item, 'wp:postmeta').map((m) => [one(m, 'wp:meta_key'), one(m, 'wp:meta_value')]));
    const attachments = new Map();
    for (const it of items) {
      if (one(it, 'wp:post_type') === 'attachment') attachments.set(one(it, 'wp:post_id'), { url: one(it, 'wp:attachment_url'), alt: meta(it)._wp_attachment_image_alt || '' });
    }
    const posts = [];
    for (const it of items) {
      const st = one(it, 'wp:status');
      if (one(it, 'wp:post_type') !== 'post' || st === 'trash' || st === 'auto-draft') continue;
      const thumb = attachments.get(meta(it)._thumbnail_id);
      const creator = one(it, 'dc:creator');
      const date = one(it, 'wp:post_date').slice(0, 10);
      posts.push({
        sourceId: Number(one(it, 'wp:post_id')) || null,
        link: one(it, 'link') || one(it, 'guid'),
        title: one(it, 'title'),
        slug: one(it, 'wp:post_name'),
        date: date === '0000-00-00' ? '' : date,
        status: st,
        author: authors.get(creator) || creator,
        categories: kids(it, 'category').filter((c) => c.getAttribute('domain') === 'category').map((c) => c.textContent),
        html: one(it, 'content:encoded'),
        excerptHtml: one(it, 'excerpt:encoded'),
        featuredImage: thumb?.url ? thumb : null,
      });
    }
    return { posts, siteUrl: one(channel, 'wp:base_blog_url') || one(channel, 'link'), title: one(channel, 'title') };
  }

  async function readFile(file) {
    if (!file) return;
    status(`Reading ${file.name}…`);
    try {
      await loadExisting();
      const { posts, siteUrl, title } = parseWxr(await file.text());
      if (!posts.length) throw new Error('That export has no posts in it. In WordPress, choose “Posts” (or “All content”) when exporting.');
      state.siteUrl = siteUrl;
      showPicker(posts, title ? `from “${title}”` : `from ${file.name}`);
      status('');
    } catch (err) {
      status(err.message, true);
    }
  }
  $('wxr-file').addEventListener('change', (e) => readFile(e.target.files[0]));
  const dz = $('dropzone');
  ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, () => dz.classList.remove('over')));
  dz.addEventListener('drop', (e) => { e.preventDefault(); readFile(e.dataTransfer.files[0]); });

  // ---------- Picking posts
  const isDup = (p) => state.existing.slugs.has(cleanSlug(p.slug, p.title)) || (p.link && state.existing.urls.has(p.link));

  function showPicker(posts, from) {
    state.posts = posts
      .map((p) => ({ ...p, dup: isDup(p), selected: !isDup(p) }))
      .sort((a, b) => (b.date || '9999').localeCompare(a.date || '9999'));
    const dups = state.posts.filter((p) => p.dup).length;
    $('found-label').textContent = `· ${posts.length} found ${from}${dups ? `, ${dups} already here` : ''}`;
    $('step-pick').hidden = false;
    $('step-run').hidden = true;
    renderList();
    $('step-pick').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderList() {
    const list = $('pick-list');
    list.replaceChildren(...state.posts.map((p, i) => {
      const box = el('input', { type: 'checkbox', checked: p.selected, 'aria-describedby': `pm-${i}`, onchange: (e) => { p.selected = e.target.checked; updateCounts(); } });
      return el('label', { class: 'pick-row' + (p.dup ? ' dup' : '') },
        box,
        p.featuredImage?.url ? el('img', { src: p.featuredImage.url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : el('span', { class: 'noimg', 'aria-hidden': 'true' }),
        el('span', { class: 'txt' },
          el('span', { class: 't' }, p.title || 'Untitled post'),
          el('span', { class: 'm', id: `pm-${i}` },
            el('span', { class: 'pill' + (p.status === 'publish' ? ' pub' : p.status === 'future' ? ' sch' : '') }, STATUS_LABEL[p.status] || p.status),
            `${fmtDate(p.date)} · ${mapCategory(p.categories || [])}`,
            p.dup ? el('span', { class: 'dup-note' }, 'Already on this site') : null)));
    }));
    updateCounts();
  }

  function updateCounts() {
    const n = state.posts.filter((p) => p.selected).length;
    $('start-import').textContent = n === 1 ? 'Import 1 post' : `Import ${n} posts`;
    $('start-import').disabled = n === 0;
    const all = $('select-all');
    all.checked = n === state.posts.length;
    all.indeterminate = n > 0 && n < state.posts.length;
  }

  $('select-all').addEventListener('change', (e) => {
    state.posts.forEach((p) => { p.selected = e.target.checked; });
    renderList();
  });
  $('default-category').addEventListener('change', renderList);
  $('start-over').addEventListener('click', () => {
    $('step-pick').hidden = true;
    state.posts = [];
    $('step-source').scrollIntoView({ behavior: 'smooth' });
  });

  // ---------- Importing
  const ICON = { imported: '✓', skipped: '–', failed: '!' };

  function resultItem(r) {
    const label = r.status === 'imported'
      ? `Imported${r.postStatus ? ` as ${r.postStatus.toLowerCase()}` : ''}`
      : r.status === 'skipped' ? `Skipped: ${r.reason}` : `Didn’t import: ${r.reason}`;
    const href = r.slug ? `/stories/${encodeURIComponent(r.slug)}${r.postStatus === 'Published' ? '' : '?preview=1'}` : null;
    return el('li', { class: `result ${r.status}` },
      el('span', { class: 'ico', 'aria-hidden': 'true' }, ICON[r.status]),
      el('span', { class: 'txt' },
        href ? el('a', { href, target: '_blank', rel: 'noopener' }, r.title) : el('strong', {}, r.title),
        el('span', { class: 'm' }, label),
        r.warnings?.length ? el('details', {}, el('summary', {}, `${r.warnings.length} note${r.warnings.length > 1 ? 's' : ''}`),
          el('ul', {}, ...r.warnings.map((w) => el('li', {}, w)))) : null));
  }

  $('start-import').addEventListener('click', async () => {
    const chosen = state.posts.filter((p) => p.selected);
    if (!chosen.length || state.running) return;
    const options = {
      defaultCategory: $('default-category').value,
      asDrafts: $('as-drafts').checked,
      copyImages: $('copy-images').checked,
      siteUrl: state.siteUrl,
    };
    state.running = true;
    state.stop = false;
    $('step-pick').hidden = true;
    $('step-run').hidden = false;
    $('run-done').hidden = true;
    $('results').replaceChildren();
    $('run-title').textContent = 'Importing…';
    const stopBtn = el('button', { type: 'button', class: 'btn small', onclick: () => { state.stop = true; stopBtn.disabled = true; stopBtn.textContent = 'Stopping after this post…'; } }, 'Stop');
    $('progress-label').after(stopBtn);
    $('progress').setAttribute('aria-valuemax', String(chosen.length));
    $('step-run').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const tally = { imported: 0, skipped: 0, failed: 0 };
    for (let i = 0; i < chosen.length && !state.stop; i++) {
      const p = chosen[i];
      $('progress-label').textContent = `${i + 1} of ${chosen.length}: ${p.title || 'Untitled post'}`;
      let r;
      try {
        const { dup, selected, ...post } = p;
        // A post flagged as already here but ticked anyway imports as a copy.
        r = await api('POST', '/admin/api/import/post', { post, options: { ...options, skipExisting: !dup } });
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          r = { status: 'failed', title: p.title, reason: 'your login expired. Reload the page, log in and import the rest.' };
          state.stop = true;
        } else {
          r = { status: 'failed', title: p.title, reason: err.message };
        }
      }
      tally[r.status] = (tally[r.status] || 0) + 1;
      $('results').append(resultItem(r));
      $('progress').setAttribute('aria-valuenow', String(i + 1));
      $('progress-bar').style.width = `${((i + 1) / chosen.length) * 100}%`;
    }

    stopBtn.remove();
    state.running = false;
    const parts = [`${tally.imported} imported`];
    if (tally.skipped) parts.push(`${tally.skipped} skipped`);
    if (tally.failed) parts.push(`${tally.failed} didn’t import`);
    $('run-title').textContent = state.stop ? 'Import stopped' : 'Import finished';
    $('progress-label').textContent = parts.join(' · ') + (options.asDrafts && tally.imported ? '. Imported posts are drafts: open Blog posts to review and publish them.' : '.');
    $('run-done').hidden = false;
  });

  $('import-more').addEventListener('click', () => {
    $('step-run').hidden = true;
    $('step-pick').hidden = true;
    $('wxr-file').value = '';
    $('step-source').scrollIntoView({ behavior: 'smooth' });
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.running) { e.preventDefault(); e.returnValue = ''; }
  });
})();

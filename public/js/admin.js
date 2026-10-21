// Blog post editor. Mirrors the admin design: status tabs, searchable list,
// and an editor that keeps unsaved changes per post until you save.
(() => {
  const boot = JSON.parse(document.getElementById('boot').textContent);
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const $ = (id) => document.getElementById(id);

  const TABS = ['All', 'Published', 'Drafts', 'Scheduled'];
  const state = {
    posts: boot.posts,
    edits: new Map(), // id -> edited copy, only while unsaved
    tab: 'All',
    query: '',
    selected: boot.posts[0]?.id ?? null,
    nextTemp: 1,
  };

  const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled-post';
  const isLive = (p) => p.status === 'Published' || (p.status === 'Scheduled' && p.date && p.date <= boot.today);
  const shownStatus = (p) => (isLive(p) ? 'Published' : p.status);
  const pillClass = (s) => (s === 'Published' ? 'pill pub' : s === 'Scheduled' ? 'pill sch' : 'pill');
  const isNew = (id) => typeof id === 'string';
  const saved = (id) => state.posts.find((p) => p.id === id);
  const current = (id = state.selected) => state.edits.get(id) || saved(id);
  const words = (t) => ((t || '').trim() ? t.trim().split(/\s+/).length : 0);
  const fmtDate = (d) => (d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'No date');
  const matchTab = (p, t) => t === 'All' || (t === 'Drafts' ? shownStatus(p) === 'Draft' : shownStatus(p) === t);

  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }

  async function api(method, url, body, headers = {}) {
    const isFile = body instanceof Blob;
    const res = await fetch(url, {
      method,
      headers: { 'X-CSRF-Token': csrf, ...(body && !isFile ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body == null ? undefined : isFile ? body : JSON.stringify(body),
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
    return data;
  }

  // ---------- Toast
  let toastTimer;
  function toast(msg, isErr = false) {
    const t = $('toast');
    clearTimeout(toastTimer);
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    t.hidden = false;
    toastTimer = setTimeout(() => { t.hidden = true; }, isErr ? 6000 : 2600);
  }

  // ---------- Rendering
  function renderHeader() {
    const all = state.posts.concat([...state.edits.values()].filter((p) => isNew(p.id)));
    const drafts = all.filter((p) => shownStatus(p) === 'Draft').length;
    $('count-label').textContent = `${all.length} posts · ${drafts} drafts`;

    const tabs = $('tabs');
    tabs.replaceChildren(...TABS.map((t) => el('button', {
      type: 'button', role: 'tab', 'aria-selected': String(state.tab === t),
      onclick: () => { state.tab = t; render(); },
    }, t + ' ', el('span', { class: 'n' }, String(all.filter((p) => matchTab(p, t)).length)))));
  }

  function rows() {
    const q = state.query.trim().toLowerCase();
    const unsavedNew = [...state.edits.values()].filter((p) => isNew(p.id));
    return unsavedNew.concat(state.posts)
      .map((p) => current(p.id) || p)
      .filter((p) => matchTab(p, state.tab) && (!q || (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)));
  }

  function renderList() {
    const list = $('post-list');
    const items = rows();
    if (!items.length) {
      list.replaceChildren(el('p', { class: 'empty-card' }, 'No posts match. Try another search or tab.'));
      return;
    }
    list.replaceChildren(...items.map((p) => {
      const s = shownStatus(p);
      return el('button', {
        type: 'button', class: 'row', 'aria-pressed': String(p.id === state.selected),
        onclick: () => select(p.id),
      },
      p.image ? el('img', { src: p.image, alt: '' }) : el('span', { class: 'noimg' }),
      el('span', { class: 'txt' },
        el('span', { class: 't' }, (p.title || 'Untitled post') + (state.edits.has(p.id) ? ' •' : '')),
        el('span', { class: 'm' }, el('span', { class: pillClass(s) }, s), `${p.category} · ${fmtDate(p.date)}`)));
    }));
  }

  // Fills the form. Only runs when the selection changes, so typing never
  // loses the caret.
  function fillEditor() {
    const p = current();
    $('editor').hidden = !p;
    if (!p) return;
    $('f-title').value = p.title || '';
    $('f-category').value = p.category || boot.categories[0];
    $('f-author').value = p.author || '';
    $('f-date').value = p.date || '';
    $('f-excerpt').value = p.excerpt || '';
    $('f-body').value = p.body || '';
    $('f-image-alt').value = p.imageAlt || '';
    $('toast').hidden = true;
    renderEditorMeta();
  }

  function renderEditorMeta() {
    const p = current();
    if (!p) return;
    const s = shownStatus(p);
    const st = $('cur-status');
    st.className = pillClass(s);
    st.textContent = s;
    $('unsaved').hidden = !state.edits.has(p.id);

    const live = !isNew(p.id) && isLive(saved(p.id));
    const slug = live ? saved(p.id).slug : slugify(p.title);
    $('slug').textContent = `${boot.siteUrl.replace(/^https?:\/\//, '')}/stories/${slug}`;

    const img = $('f-image-preview');
    if (p.image) img.src = p.image; else img.removeAttribute('src');
    $('f-image-remove').hidden = !p.image;

    $('excerpt-count').textContent = (p.excerpt || '').length;
    const w = words(p.body);
    $('word-count').textContent = `${w} words · about ${Math.max(1, Math.round(w / 220))} min read`;

    const future = p.date && p.date > boot.today;
    $('publish').textContent = s === 'Published' ? 'Update' : future ? 'Schedule' : 'Publish';
    $('save-draft').textContent = s === 'Draft' || isNew(p.id) ? 'Save draft' : 'Move to drafts';

    const preview = $('preview');
    preview.href = isNew(p.id) ? '#' : `/stories/${saved(p.id).slug}${live ? '' : '?preview=1'}`;
    preview.setAttribute('aria-disabled', String(isNew(p.id)));
  }

  function render() {
    renderHeader();
    renderList();
    renderEditorMeta();
  }

  function select(id) {
    state.selected = id;
    render();
    fillEditor();
    if (window.matchMedia('(max-width: 900px)').matches) $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Editing
  function edit(field, value) {
    const id = state.selected;
    const base = current(id);
    if (!base || base[field] === value) return;
    state.edits.set(id, { ...base, [field]: value });
    renderHeader();
    renderList();
    renderEditorMeta();
  }

  const bind = (id, field) => $(id).addEventListener('input', (e) => edit(field, e.target.value));
  bind('f-title', 'title');
  bind('f-author', 'author');
  bind('f-date', 'date');
  bind('f-excerpt', 'excerpt');
  bind('f-body', 'body');
  bind('f-image-alt', 'imageAlt');
  $('f-category').addEventListener('change', (e) => edit('category', e.target.value));
  $('search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });

  $('new-post').addEventListener('click', () => {
    const id = `new-${state.nextTemp++}`;
    state.edits.set(id, { id, title: '', category: boot.categories[0], author: '', date: '', status: 'Draft', image: '', imageAlt: '', excerpt: '', body: '' });
    state.tab = 'All';
    state.query = '';
    $('search').value = '';
    select(id);
    $('f-title').focus();
  });

  async function save(status) {
    const id = state.selected;
    const p = current(id);
    if (!p) return;
    if (status !== 'Draft' && !p.title.trim()) {
      toast('Add a title before publishing.', true);
      $('f-title').focus();
      return;
    }
    const buttons = [$('save-draft'), $('publish')];
    buttons.forEach((b) => { b.disabled = true; });
    const wasLive = !isNew(id) && isLive(saved(id));
    const fields = ['title', 'category', 'author', 'date', 'image', 'imageAlt', 'excerpt', 'body'];
    const payload = Object.fromEntries(fields.map((f) => [f, p[f] ?? '']));
    payload.status = status;
    try {
      const { post } = isNew(id)
        ? await api('POST', '/admin/api/posts', payload)
        : await api('PUT', `/admin/api/posts/${id}`, payload);
      state.edits.delete(id);
      if (isNew(id)) state.posts.unshift(post);
      else state.posts = state.posts.map((x) => (x.id === id ? post : x));
      state.selected = post.id;
      render();
      fillEditor();
      if (status === 'Draft') toast(wasLive ? 'Moved to drafts. It’s no longer on the site.' : 'Draft saved');
      else if (post.status === 'Scheduled') toast(`Scheduled for ${fmtDate(post.date)}`);
      else toast(wasLive ? 'Changes are live' : 'Post published');
    } catch (err) {
      toast(err.message, true);
    } finally {
      buttons.forEach((b) => { b.disabled = false; });
    }
  }

  $('save-draft').addEventListener('click', () => save('Draft'));
  $('publish').addEventListener('click', () => save('Published'));

  $('preview').addEventListener('click', (e) => {
    const id = state.selected;
    if (isNew(id)) { e.preventDefault(); toast('Save the post first, then preview it.', true); return; }
    if (state.edits.has(id)) toast('Preview shows the last saved version. Save to see your latest changes.');
  });

  $('delete').addEventListener('click', async () => {
    const id = state.selected;
    const p = current(id);
    if (!p || !confirm(`Delete “${p.title || 'Untitled post'}”? This can’t be undone.`)) return;
    try {
      if (!isNew(id)) await api('DELETE', `/admin/api/posts/${id}`);
      state.edits.delete(id);
      state.posts = state.posts.filter((x) => x.id !== id);
      state.selected = rows()[0]?.id ?? state.posts[0]?.id ?? null;
      render();
      fillEditor();
    } catch (err) {
      toast(err.message, true);
    }
  });

  // ---------- Images
  async function upload(file) {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) { toast('That image is over 8MB. Please use a smaller one.', true); return null; }
    toast('Uploading image…');
    try {
      const { url } = await api('POST', '/admin/api/upload', file, { 'Content-Type': file.type });
      $('toast').hidden = true;
      return url;
    } catch (err) {
      toast(err.message, true);
      return null;
    }
  }

  $('f-image-file').addEventListener('change', async (e) => {
    const url = await upload(e.target.files[0]);
    e.target.value = '';
    if (url) edit('image', url);
  });
  $('f-image-remove').addEventListener('click', () => edit('image', ''));

  // ---------- Formatting toolbar (Markdown)
  const body = $('f-body');
  function wrap(before, after = before, placeholder = '') {
    const { selectionStart: s, selectionEnd: e, value } = body;
    const sel = value.slice(s, e) || placeholder;
    body.setRangeText(before + sel + after, s, e, 'end');
    if (!value.slice(s, e)) body.setSelectionRange(s + before.length, s + before.length + sel.length);
    body.focus();
    edit('body', body.value);
  }
  function prefixLines(prefix) {
    const { selectionStart: s, selectionEnd: e, value } = body;
    const start = value.lastIndexOf('\n', s - 1) + 1;
    const block = value.slice(start, e).split('\n').map((l) => prefix + l).join('\n');
    body.setRangeText(block, start, e, 'end');
    body.focus();
    edit('body', body.value);
  }
  const insertBlock = (text) => {
    const { selectionStart: s, value } = body;
    const pre = s > 0 && value[s - 1] !== '\n' ? '\n\n' : '';
    body.setRangeText(pre + text + '\n\n', s, body.selectionEnd, 'end');
    body.focus();
    edit('body', body.value);
  };

  document.querySelector('.toolbar').addEventListener('click', (e) => {
    const cmd = e.target.closest('button')?.dataset.cmd;
    if (cmd === 'bold') wrap('**', '**', 'bold text');
    else if (cmd === 'italic') wrap('*', '*', 'italic text');
    else if (cmd === 'heading') prefixLines('## ');
    else if (cmd === 'quote') prefixLines('> ');
    else if (cmd === 'list') prefixLines('- ');
    else if (cmd === 'link') {
      const url = prompt('Link address (https://…)');
      if (url) wrap('[', `](${url})`, 'link text');
    } else if (cmd === 'image') $('body-image-file').click();
  });

  $('body-image-file').addEventListener('change', async (e) => {
    const url = await upload(e.target.files[0]);
    e.target.value = '';
    if (!url) return;
    const alt = prompt('Describe the image (for screen readers)') || '';
    const caption = prompt('Caption (optional)') || '';
    insertBlock(`![${alt.replace(/[\[\]]/g, '')}](${url}${caption ? ` "${caption.replace(/"/g, '”')}"` : ''})`);
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.edits.size) { e.preventDefault(); e.returnValue = ''; }
  });

  // List rows fade in on first load only, not on every re-render while typing.
  $('post-list').classList.add('intro');
  setTimeout(() => $('post-list').classList.remove('intro'), 800);
  render();
  fillEditor();
})();

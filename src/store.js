import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SEED_POSTS = path.join(ROOT, 'seed', 'posts.json');

export const STATUSES = ['Draft', 'Scheduled', 'Published'];
export const EXCERPT_MAX = 180;

// One JSON file per collection, loaded into memory at startup. Writes go
// through a queue and land via temp file + rename so a crash never leaves a
// half-written file behind.
class Collection {
  constructor(name, seedFile) {
    this.file = path.join(DATA_DIR, name + '.json');
    this.queue = Promise.resolve();
    if (!fs.existsSync(this.file)) {
      const seed = seedFile && fs.existsSync(seedFile) ? fs.readFileSync(seedFile, 'utf8') : '[]';
      fs.writeFileSync(this.file, seed);
    }
    this.items = JSON.parse(fs.readFileSync(this.file, 'utf8'));
  }

  save() {
    const json = JSON.stringify(this.items, null, 2);
    this.queue = this.queue.then(async () => {
      const tmp = this.file + '.' + process.pid + '.tmp';
      await fs.promises.writeFile(tmp, json);
      await fs.promises.rename(tmp, this.file);
    });
    return this.queue;
  }
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const posts = new Collection('posts', SEED_POSTS);
const messages = new Collection('messages');
const subscribers = new Collection('subscribers');

export const today = () => new Date().toISOString().slice(0, 10);

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'untitled-post';
}

export function wordCount(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

export const readMinutes = (text) => Math.max(1, Math.round(wordCount(text) / 220));

// A scheduled post goes live on its publish date without anyone touching it.
export function isLive(p, on = today()) {
  if (p.status === 'Published') return true;
  return p.status === 'Scheduled' && !!p.date && p.date <= on;
}

const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id;

export function livePosts({ category } = {}) {
  return posts.items
    .filter((p) => isLive(p) && (!category || p.category === category))
    .sort(byDateDesc);
}

export function allPosts() {
  return [...posts.items].sort((a, b) => {
    // Drafts with no date float to the top, like the admin design.
    if (!a.date !== !b.date) return a.date ? 1 : -1;
    return byDateDesc(a, b);
  });
}

export const findPost = (id) => posts.items.find((p) => p.id === id);
export const findPostBySlug = (slug) => posts.items.find((p) => p.slug === slug);

function uniqueSlug(base, id) {
  let slug = base;
  for (let n = 2; posts.items.some((p) => p.slug === slug && p.id !== id); n++) slug = `${base}-${n}`;
  return slug;
}

const str = (v, max = 100000) => (typeof v === 'string' ? v : '').slice(0, max);

// Cleans whatever the admin editor sent into a valid post. Publishing with a
// future date becomes Scheduled, and a published post with no date gets today.
export function normalizePost(input, existing = {}) {
  const p = { ...existing };
  if ('title' in input) p.title = str(input.title, 300).trim();
  if ('category' in input) p.category = str(input.category, 60).trim();
  if ('author' in input) p.author = str(input.author, 120).trim();
  if ('image' in input) p.image = str(input.image, 500).trim();
  if ('imageAlt' in input) p.imageAlt = str(input.imageAlt, 300).trim();
  if ('excerpt' in input) p.excerpt = str(input.excerpt, EXCERPT_MAX);
  if ('body' in input) p.body = str(input.body);
  if ('date' in input) p.date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : '';
  if ('status' in input && STATUSES.includes(input.status)) p.status = input.status;

  p.title ??= '';
  p.category ||= 'Anxiety';
  p.author ??= '';
  p.image ??= '';
  p.imageAlt ??= '';
  p.excerpt ??= '';
  p.body ??= '';
  p.date ??= '';
  p.status ||= 'Draft';

  if (p.status !== 'Draft') {
    if (!p.date) p.date = today();
    p.status = p.date > today() ? 'Scheduled' : 'Published';
  }
  return p;
}

export async function createPost(input) {
  const id = posts.items.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const p = normalizePost(input);
  p.id = id;
  p.slug = uniqueSlug(slugify(input.slug || p.title), id);
  p.createdAt = p.updatedAt = new Date().toISOString();
  posts.items.push(p);
  await posts.save();
  return p;
}

export async function updatePost(id, input) {
  const i = posts.items.findIndex((p) => p.id === id);
  if (i === -1) return null;
  const p = normalizePost(input, posts.items[i]);
  // Slugs follow the title until the post goes live. After that the URL is
  // public and stays put unless the editor changes it on purpose.
  const wantSlug = input.slug ? slugify(input.slug) : !isLive(posts.items[i]) && 'title' in input ? slugify(p.title) : p.slug;
  p.slug = uniqueSlug(wantSlug, id);
  p.updatedAt = new Date().toISOString();
  posts.items[i] = p;
  await posts.save();
  return p;
}

export async function deletePost(id) {
  const before = posts.items.length;
  posts.items = posts.items.filter((p) => p.id !== id);
  if (posts.items.length === before) return false;
  await posts.save();
  return true;
}

export async function addMessage({ name, email, topic, message, newsletter }) {
  const m = {
    id: crypto.randomUUID(),
    name: str(name, 200).trim(),
    email: str(email, 320).trim(),
    topic: str(topic, 100).trim(),
    message: str(message, 10000).trim(),
    newsletter: !!newsletter,
    read: false,
    receivedAt: new Date().toISOString(),
  };
  messages.items.unshift(m);
  await messages.save();
  return m;
}

export const allMessages = () => messages.items;

export async function markMessageRead(id, read = true) {
  const m = messages.items.find((x) => x.id === id);
  if (!m) return null;
  m.read = read;
  await messages.save();
  return m;
}

export async function deleteMessage(id) {
  const before = messages.items.length;
  messages.items = messages.items.filter((m) => m.id !== id);
  if (messages.items.length === before) return false;
  await messages.save();
  return true;
}

// Returns false when the address was already on the list.
export async function addSubscriber(email, source) {
  const e = str(email, 320).trim().toLowerCase();
  if (subscribers.items.some((s) => s.email === e)) return false;
  subscribers.items.unshift({ email: e, source: str(source, 60), subscribedAt: new Date().toISOString() });
  await subscribers.save();
  return true;
}

export const allSubscribers = () => subscribers.items;

export async function deleteSubscriber(email) {
  const before = subscribers.items.length;
  subscribers.items = subscribers.items.filter((s) => s.email !== email);
  if (subscribers.items.length === before) return false;
  await subscribers.save();
  return true;
}

export const isEmail = (s) => typeof s === 'string' && s.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

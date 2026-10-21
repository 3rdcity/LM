import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';

// Two interchangeable backends with the same async API:
//   - "file": JSON files under DATA_DIR, for running on your own machine or a VPS
//   - "blobs": Netlify Blobs, for Netlify, where functions have no lasting disk
// Each record is its own key, so two visitors writing at once can't
// overwrite each other's data.

export const backendName = () =>
  process.env.STORAGE || (process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext ? 'blobs' : 'file');

// Defaults to data/ in the project. import.meta.url is empty in a CommonJS
// bundle, but the file backend never runs there.
const dataDir = () =>
  path.resolve(process.env.DATA_DIR || (import.meta.url ? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data') : 'data'));

const fileName = (key) => encodeURIComponent(key) + '.json';

const fileBackend = {
  async list(col) {
    const dir = path.join(dataDir(), col);
    let names;
    try {
      names = await fs.promises.readdir(dir);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    const items = await Promise.all(names.filter((n) => n.endsWith('.json')).map((n) =>
      fs.promises.readFile(path.join(dir, n), 'utf8').then(JSON.parse).catch(() => null)));
    return items.filter(Boolean);
  },
  async get(col, key) {
    try {
      return JSON.parse(await fs.promises.readFile(path.join(dataDir(), col, fileName(key)), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  },
  async set(col, key, value) {
    const dir = path.join(dataDir(), col);
    await fs.promises.mkdir(dir, { recursive: true });
    // Temp file + rename, so a crash never leaves half a record behind.
    const file = path.join(dir, fileName(key));
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(value, null, 2));
    await fs.promises.rename(tmp, file);
  },
  async delete(col, key) {
    await fs.promises.rm(path.join(dataDir(), col, fileName(key)), { force: true });
  },
  async putFile(name, data, contentType) {
    const dir = path.join(dataDir(), 'uploads');
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, name), data);
    return contentType;
  },
  async getFile(name) {
    try {
      return { data: await fs.promises.readFile(path.join(dataDir(), 'uploads', name)) };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  },
};

// Strong consistency so an edit shows up on the very next page load.
const store = (col) => getStore({ name: `lm-${col}`, consistency: 'strong' });

const blobsBackend = {
  async list(col) {
    const s = store(col);
    const { blobs } = await s.list();
    const items = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })));
    return items.filter(Boolean);
  },
  get: (col, key) => store(col).get(key, { type: 'json' }),
  set: (col, key, value) => store(col).setJSON(key, value),
  delete: (col, key) => store(col).delete(key),
  async putFile(name, data, contentType) {
    await store('uploads').set(name, new Blob([data]), { metadata: { contentType } });
  },
  async getFile(name) {
    const res = await store('uploads').getWithMetadata(name, { type: 'arrayBuffer' });
    return res ? { data: Buffer.from(res.data), contentType: res.metadata?.contentType } : null;
  },
};

export const backend = () => (backendName() === 'blobs' ? blobsBackend : fileBackend);

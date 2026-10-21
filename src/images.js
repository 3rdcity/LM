import crypto from 'node:crypto';
import { today } from './store.js';

// Image types the site stores and serves. GIF is here mainly for posts
// imported from WordPress, where GIFs are common.
export const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
export const EXT_TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([t, e]) => [e, t]));

// Checks the file's first bytes, so a renamed file can't pose as an image.
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 4).toString() === 'GIF8') return 'image/gif';
  return null;
}

export const looksLikeImage = (buf, type) => sniffImage(buf) === type;

export const newUploadName = (type) => `${today()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[type]}`;

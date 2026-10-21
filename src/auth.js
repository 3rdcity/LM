import crypto from 'node:crypto';

const COOKIE = 'lm_admin';
const MAX_AGE_S = 60 * 60 * 24 * 14;

// Sessions are signed with SESSION_SECRET. Without one, the key is derived
// from ADMIN_PASSWORD, so every server instance (Netlify runs many) agrees on
// it, and changing the password logs everyone out.
const secret = () =>
  process.env.SESSION_SECRET || crypto.createHash('sha256').update('lm-session:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');
export const sessionSecretIsDerived = () => !process.env.SESSION_SECRET;
export const adminEnabled = () => !!process.env.ADMIN_PASSWORD;

const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkPassword(given) {
  const want = process.env.ADMIN_PASSWORD;
  if (!want || typeof given !== 'string') return false;
  // Hash both so the comparison is constant-time whatever the lengths.
  const h = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(h(given), h(want));
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionToken(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp)) || Number(exp) < Date.now() / 1000) return null;
  return raw;
}

export const isAdmin = (req) => adminEnabled() && !!sessionToken(req);

export const csrfToken = (req) => {
  const t = sessionToken(req);
  return t ? sign('csrf:' + t) : '';
};

const cookieFlags = (req) => `Path=/; HttpOnly; SameSite=Lax${req.secure ? '; Secure' : ''}`;

export function startSession(req, res) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE_S);
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${MAX_AGE_S}; ${cookieFlags(req)}`);
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieFlags(req)}`);
}

export function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  if (req.originalUrl.startsWith('/admin/api/')) return res.status(401).json({ error: 'Signed out. Please log in again.' });
  res.redirect('/admin');
}

// Every state-changing admin request carries the token, from a form field
// or the X-CSRF-Token header the editor sends.
export function requireCsrf(req, res, next) {
  const given = req.get('x-csrf-token') || req.body?._csrf;
  if (given && safeEqual(given, csrfToken(req))) return next();
  if (req.originalUrl.startsWith('/admin/api/')) return res.status(403).json({ error: 'Your session expired. Reload the page and try again.' });
  res.status(403).send('Session expired. Go back, reload the page and try again.');
}

// Slows down password guessing: 10 tries per 15 minutes per IP.
const attempts = new Map();
export function loginAllowed(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.start > 15 * 60 * 1000) {
    attempts.set(ip, { start: now, n: 1 });
    return true;
  }
  a.n += 1;
  return a.n <= 10;
}
export const loginSucceeded = (ip) => attempts.delete(ip);

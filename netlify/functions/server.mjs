// Runs the whole site inside one Netlify Function. Static files (CSS, JS,
// photos) are served by Netlify's CDN, everything else lands here.
//
// This uses Netlify's current function format, where Netlify Blobs is set up
// automatically with strong consistency, so an edit shows on the very next
// page load. That format speaks web-standard Request/Response, so the
// Express app is bridged through serverless-http.
import serverless from 'serverless-http';
import { app } from '../../server.js';

// Functions have no lasting disk, so content lives in Netlify Blobs.
process.env.STORAGE ||= 'blobs';

// Netlify sits in front as a proxy: trust it for HTTPS and the visitor's IP.
app.set('trust proxy', true);

const handle = serverless(app, { binary: ['image/*'] });

export default async (request) => {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  // Netlify terminates HTTPS, so tell Express the original protocol.
  headers['x-forwarded-proto'] ||= url.protocol.replace(':', '');
  const body = ['GET', 'HEAD'].includes(request.method) ? null : Buffer.from(await request.arrayBuffer());
  const query = {};
  for (const [k, v] of url.searchParams) (query[k] ||= []).push(v);

  const res = await handle({
    httpMethod: request.method,
    path: url.pathname,
    headers,
    multiValueQueryStringParameters: query,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: body ? body.toString('base64') : null,
    isBase64Encoded: !!body,
    requestContext: {},
  }, {});

  const out = new Headers();
  for (const [k, v] of Object.entries(res.headers || {})) out.set(k, String(v));
  // Several cookies can't share one header, so append them one by one.
  for (const [k, vs] of Object.entries(res.multiValueHeaders || {})) {
    out.delete(k);
    for (const v of vs) out.append(k, String(v));
  }
  const resBody = res.statusCode === 204 || res.statusCode === 304 || request.method === 'HEAD'
    ? null
    : res.isBase64Encoded ? Buffer.from(res.body, 'base64') : res.body;
  return new Response(resBody, { status: res.statusCode, headers: out });
};

// Every path goes to this function, but real files (CSS, JS, images) win.
export const config = {
  path: ['/', '/*'],
  preferStatic: true,
};

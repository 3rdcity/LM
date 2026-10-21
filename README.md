# Leya.M website

Personal brand site for Leya Mnangagwa, built from the approved designs in `designs/` and the notes in `BUILD_BRIEF.md`.

It's a small Node.js server that renders plain HTML. There's no database to run: on Netlify, content lives in Netlify Blobs. Locally, it's JSON files under `data/`.

## Run it

Needs Node 20 or newer.

```bash
npm install
cp .env.example .env        # then fill in ADMIN_PASSWORD at least
node --env-file=.env server.js
```

Open http://localhost:3000. The admin is at http://localhost:3000/admin.

`npm run dev` restarts on file changes. `npm test` runs the test suite.

## Pages

| URL | Page | Design |
|---|---|---|
| `/` | Home | `home.dc.html` |
| `/about` | About | `about.dc.html` |
| `/stories` | Blog listing, `?topic=` filters by category | `journal.dc.html` |
| `/stories/:slug` | Single post | `article.dc.html` |
| `/philanthropy` | Philanthropy | `philanthropy.dc.html` |
| `/contact` | Contact form | `contact.dc.html` |
| `/admin` | Blog editor, messages, subscribers | `admin.dc.html` |

## What works

- **Blog.** Write, edit, schedule and publish posts in `/admin`. Post bodies use Markdown, and the toolbar inserts it for you. Featured and inline images (up to 4MB) upload straight from the editor. A post published with a future date becomes *Scheduled* and goes live on that day by itself. Drafts and scheduled posts can be previewed while logged in.
- **Contact form.** Every message is saved to `/admin/messages`. Set `CONTACT_TO` and the SMTP settings and each one is also emailed to Leya, with reply-to set to the sender.
- **Newsletter.** The footer form (and the contact form opt-in) collects addresses in `/admin/subscribers`. Download them as CSV for Mailchimp, Kit or similar.
- **Donate.** Points at `DONATE_URL` once a payment provider is chosen. Until then it opens the contact form on the Arimah Foundation topic.
- Spam honeypots on both forms, CSRF protection and a login rate limit on the admin, escaped output everywhere.

## Filling in client content

Every `[PLACEHOLDER]` from the designs is still visible on the site, as the brief asks. Most of them live in one file, **`src/site.js`**: contact details, social links, venture and podcast links, impact numbers, the video link and the author bio. Change the value there and it updates everywhere.

Post authors are set per post in the admin.

## Deploying to Netlify

The repo is ready for Netlify: `netlify.toml` and `netlify/functions/server.mjs` hold the setup.

1. In Netlify, **Add new site → Import an existing project** and pick this GitHub repo. Leave the build settings as Netlify detects them (they come from `netlify.toml`).
2. Under **Site configuration → Environment variables**, add:
   - `ADMIN_PASSWORD`: the admin login. **Required**, or the admin stays switched off.
   - `SITE_URL`: the live address, e.g. `https://leyam.netlify.app` or your own domain. Used for share links and the sitemap.
   - `SESSION_SECRET` (recommended): a long random string.
   - `CONTACT_TO` plus the `SMTP_*` settings, to have contact messages emailed (see `.env.example`).
   - `DONATE_URL`, once there's a payment link.
3. Deploy, then visit `/admin` to log in.

How it runs there:

- Every page is rendered by one Netlify Function. CSS, JS and photos are served straight from Netlify's CDN.
- Posts, messages, subscribers and uploaded images live in **Netlify Blobs**, Netlify's built-in storage. There's no database to set up and it works on the free plan. Content survives redeploys.
- The first visit copies the sample posts from `seed/posts.json` into Blobs. After that the admin owns them.
- Uploaded images are capped at 4MB (a Netlify Function request limit).
- Each page view is a function call. A personal site sits well inside the free allowance, but check Netlify's usage page if traffic grows.

### Hosting elsewhere

Any host that runs Node works too: Render, Railway, Fly.io, a VPS. Run `npm start`. Content is stored as JSON files in `data/` (or `DATA_DIR`), so that folder needs **persistent storage**. Set `TRUST_PROXY=true` behind a load balancer.

## Project layout

```
server.js            routes
src/site.js          client content and placeholders
src/store.js         posts, messages, subscribers
src/storage.js       storage backends: local files or Netlify Blobs
netlify/functions/   Netlify Function that runs the site
netlify.toml         Netlify build settings
src/auth.js          admin login, sessions, CSRF
src/mail.js          contact-form email
src/markdown.js      post body rendering
src/views/           page templates
public/              CSS, JS, favicon
images/              site photos
seed/posts.json      sample posts loaded on first start
designs/             original approved designs (reference only)
test/                node:test suite
```

## Changes from the designs

Decisions taken on the brief's "known issues", for the client to confirm:

- "Stillwell" is gone everywhere. The logo is *Leya.M* and the footer reads "© Leya Mnangagwa".
- Every page uses the same nav (Home · About · Stories · Philanthropy · Contact) and the same header button, **"Say hello · Get in touch"**, linking to the contact form.
- On the home page, the therapy-practice sections are **removed**: "Why Stillwell", the FAQ and the booking form. The three venture cards stay, but their therapy descriptions are swapped for wording that already appears on the about and philanthropy designs. The services intro sentence was cut off in the design, so it ends in `[COPY TO COME]`.
- The fixed 932px height on the home about section is gone.
- The article page drops the therapy "Book a free call" box, and the journal intro no longer mentions therapists.
- The admin keeps the posts editor from the design and adds working Messages and Subscribers screens. The Dashboard, Pages, Media and Settings links in the design had nothing behind them, so they're left out.
- Photos were recompressed (4.2MB down to 1.2MB). `garden-pergola.png` is now a JPG.

# Leya.M website

Personal brand site for Leya Mnangagwa, built from the approved designs in `designs/` and the notes in `BUILD_BRIEF.md`.

It's a small Node.js server that renders plain HTML. There's no database to run: posts, messages and subscribers live in JSON files under `data/`.

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

- **Blog.** Write, edit, schedule and publish posts in `/admin`. Post bodies use Markdown, and the toolbar inserts it for you. Featured and inline images upload straight from the editor. A post published with a future date becomes *Scheduled* and goes live on that day by itself. Drafts and scheduled posts can be previewed while logged in.
- **Contact form.** Every message is saved to `/admin/messages`. Set `CONTACT_TO` and the SMTP settings and each one is also emailed to Leya, with reply-to set to the sender.
- **Newsletter.** The footer form (and the contact form opt-in) collects addresses in `/admin/subscribers`. Download them as CSV for Mailchimp, Kit or similar.
- **Donate.** Points at `DONATE_URL` once a payment provider is chosen. Until then it opens the contact form on the Arimah Foundation topic.
- Spam honeypots on both forms, CSRF protection and a login rate limit on the admin, escaped output everywhere.

## Filling in client content

Every `[PLACEHOLDER]` from the designs is still visible on the site, as the brief asks. Most of them live in one file, **`src/site.js`**: contact details, social links, venture and podcast links, impact numbers, the video link and the author bio. Change the value there and it updates everywhere.

Post authors are set per post in the admin.

## Deploying

Any host that runs Node works: Render, Railway, Fly.io, a VPS. Two things matter:

1. **Persistent storage for `data/`.** Posts, messages, subscribers and uploaded images are written there. On hosts with throwaway filesystems, mount a volume and point `DATA_DIR` at it, or the content disappears on the next deploy.
2. **Environment variables.** At minimum `SITE_URL`, `ADMIN_PASSWORD` and `SESSION_SECRET`. Add `TRUST_PROXY=true` behind a load balancer. See `.env.example`.

First start copies the sample posts from `seed/posts.json` into `data/`. After that the admin owns them.

## Project layout

```
server.js            routes
src/site.js          client content and placeholders
src/store.js         posts, messages, subscribers (JSON files)
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

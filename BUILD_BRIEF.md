# Leya.M website — build brief

Personal brand site for **Leya Mnangagwa**: faith-led wellness advocate, founder (Wellness Without Limits, Arimah Travel & Tours, Arimah Foundation), mentor and mother of four.

## What's in this folder

- `designs/` — seven approved page designs, one HTML file each. They are design prototypes, not production code. Use them as the visual and content source of truth.
- `images/` — every photo used, already linked from the designs with relative paths.

| File | Page |
|---|---|
| `home.dc.html` | Home |
| `about.dc.html` | About |
| `journal.dc.html` | Blog listing (topic filters work) |
| `article.dc.html` | Single blog post |
| `philanthropy.dc.html` | Philanthropy initiatives |
| `contact.dc.html` | Contact form + venture links |
| `admin.dc.html` | Admin screen for editing blog posts |

### Reading the design files

- Each file is plain HTML with inline styles. Markup sits inside `<x-dc>`; ignore that wrapper, `<helmet>` (it's just the `<head>` styles) and `support.js`.
- `{{accent}}` means the primary colour, `#636B2F`.
- Other `{{…}}` holes and the `<sc-for>` / `<sc-if>` tags are loops and conditionals. Their data and behaviour are in the `class Component` script at the bottom of each file (journal filters, contact thank-you state, admin editor).
- Text in `[SQUARE BRACKETS]` is placeholder content waiting on the client. Keep it visible or wire it to the CMS. Never invent replacements.

## Design system

**Fonts** (Google Fonts): Inter Tight 300/400/500/600 for UI and body; Instrument Serif (regular + italic) for headings, card titles and the italic accent word in each headline.

**Colours**
| Token | Hex | Use |
|---|---|---|
| primary | `#636B2F` | buttons, tags, active states |
| ink | `#1E2014` | headings, body text |
| page | `#F6F6F0` | page background, hero frame |
| section-alt | `#ECEDE4` | alternating sections |
| surface | `#FFFFFF` | cards |
| dark | `#24261A` | footer, admin sidebar |
| text-muted | `#4E5A55` / `#5A6661` | body copy, meta |
| eyebrow | `#5C6235` | small uppercase section labels |
| tint | `#E9EBDC` | icon chips, success states |
| border | `#D6D9C4` | dividers, outline buttons |

**Shape and layout:** pill buttons (999px radius), cards 18–24px, hero frame 50px radius inset 30px from the edges. Content max width 1240px, 24px side gutter, 120px section padding. All pages must work at phone width (grids use `auto-fit`/`minmax`).

**Signature patterns**
- Framed hero: photo inside a rounded frame with an olive tint, nav on top, headline bottom-left, divider line and pill tags beneath.
- Blog card: image, category tag overlapping the bottom edge, white panel with a 5px primary bar beside the serif title, "READ MORE" with a long arrow.
- Eyebrow label + serif headline with one italic word.

## Motion (already in each file's `<style>`)

- Ken Burns: hero and full-bleed background photos slowly scale 1 → 1.08 over ~26s, alternating.
- Page load: nav, then hero text, fade up in sequence.
- Scroll reveal: sections fade up as they enter, using CSS `animation-timeline: view()` (progressive enhancement, content stays visible without it).
- Hover: pill buttons lift 2px, cards rise 4px, read-more arrows slide.
- Respect `prefers-reduced-motion`: switch everything off.

## Functionality to build

1. **Blog/CMS**: posts with title, slug, category, author, publish date, status (draft / scheduled / published), featured image, excerpt (max 180 chars) and body. `admin.dc.html` shows the intended editing experience. Journal listing filters by category, and the article page reads from the same data.
2. **Contact form**: name, email, topic, message, optional newsletter opt-in. Send to Leya's inbox, then show the thank-you state.
3. **Newsletter sign-up** in every footer.
4. **Donate** button on the philanthropy page (payment provider to be decided).

## Known issues to fix during the build

- **Old brand name.** "Stillwell" still appears in the home, about, article and journal files (logo/footer). Replace it with "Leya.M" and "© Leya Mnangagwa", matching the contact and philanthropy pages.
- **Nav.** Use this on every page: Home · About · Stories (journal) · Philanthropy · Contact. Some files still link to old `#team` / `#services` anchors.
- **Header button label.** It says "Call us" on some pages and "Say hello" on others. Pick one.
- **Home page leftovers.** The services, team, booking and FAQ sections still carry therapy-practice copy from an earlier concept. Confirm with the client whether to rewrite or remove them.
- **Home about section** has a fixed `height: 932px`. Remove it, or it overlaps the next section on mobile.
- **Placeholder content**: podcast/foundation descriptions and links, contact details, impact numbers, dates, authors. Do not ship invented figures.
- **Repeated photos**: several images appear on more than one page. Swap them in when the client sends more.

import { Marked } from 'marked';
import { raw, esc } from './views/html.js';

const safeUrl = (u) => (/^(https?:|mailto:|tel:|\/|#)/i.test(u || '') ? u : '#');

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    // Raw HTML in a post body is shown as text, never executed.
    html({ text }) {
      return esc(text);
    },
    // ![alt](src "caption") renders as a captioned figure.
    image({ href, title, text }) {
      const img = `<img src="${esc(safeUrl(href))}" alt="${esc(text)}" loading="lazy">`;
      return title ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>` : `<figure>${img}</figure>`;
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const external = /^https?:/i.test(href);
      const t = title ? ` title="${esc(title)}"` : '';
      return `<a href="${esc(safeUrl(href))}"${t}${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    },
  },
});

export function renderMarkdown(md) {
  // A paragraph that only holds an image would wrap the figure in <p>.
  const out = marked.parse(md || '').replace(/<p>(<figure>[\s\S]*?<\/figure>)<\/p>/g, '$1');
  return raw(out);
}

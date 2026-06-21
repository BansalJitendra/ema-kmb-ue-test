/* eslint-disable no-await-in-loop, no-console */
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { md2jcr } from '@adobe/helix-importer';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../..');
const CONTENT_DIR = path.join(REPO, 'content');
const OUT_DIR = path.join(REPO, 'migration-work', 'jcr-content');

// Collapsed field suffixes never get their own row/cell (they ride on a sibling).
const COLLAPSED = /(Title|Type|MimeType|Alt|Text)$/;

// Heading -> card image URL, recovered from the live site for cards whose
// images the scraper dropped (lazy-loaded data-srcset).
let CARD_IMAGES = {};
async function loadCardImages() {
  try {
    CARD_IMAGES = JSON.parse(await readFile(path.join(REPO, 'migration-work', 'card-images.json'), 'utf-8'));
  } catch (e) { CARD_IMAGES = {}; }
}

async function loadComponents() {
  const models = JSON.parse(await readFile(path.join(REPO, 'component-models.json'), 'utf-8'));
  const defs = JSON.parse(await readFile(path.join(REPO, 'component-definition.json'), 'utf-8'));
  const filters = JSON.parse(await readFile(path.join(REPO, 'component-filters.json'), 'utf-8'));
  const modelById = {};
  (Array.isArray(models) ? models : []).forEach((m) => { if (m.id) modelById[m.id] = m; });
  // Per-block-id metadata: title (for md2jcr lookup) and, for SIMPLE blocks
  // (definition has a `model` but no `filter`), the ordered list of
  // non-collapsed field names so we can emit one stacked row per field.
  const blockMeta = {};
  (defs.groups || []).forEach((g) => (g.components || []).forEach((c) => {
    if (!c.id || !c.title) return;
    const tpl = c.plugins?.xwalk?.page?.template || {};
    let simpleFields = null;
    if (tpl.model && !tpl.filter && modelById[tpl.model]) {
      simpleFields = (modelById[tpl.model].fields || [])
        .map((f) => f.name)
        .filter((n) => n && !COLLAPSED.test(n));
    }
    blockMeta[c.id] = { title: c.title, simpleFields };
  }));
  return { components: { models, definition: defs, filters }, blockMeta };
}

/**
 * EDS `.plain.html` represents blocks as nested divs:
 *   <div class="blockname"><div>(row)<div>(cell)…</div></div>…</div>
 * md2jcr only treats <table> markup as blocks, and matches the block by its
 * component TITLE. This converts each block div into an authoring table whose
 * header cell is the component title, preserving the row/cell grid.
 */
// Placeholder alt strings that leaked in from the source's lazy-load markup.
const BAD_ALT = /^(image is broken|img\d*|productC[Aa]rd|logo|)$/i;

/**
 * Content hygiene before block conversion:
 *  - clear meaningless placeholder alt text (derive from a sibling heading/text
 *    when possible, else empty so it isn't indexed as junk);
 *  - collapse duplicate adjacent carousel slides (the source's rotating banner
 *    emits the same slide multiple times into flat content).
 */
function normalizeContent(document) {
  const main = document.querySelector('main') || document.body;

  // 0a. strip lazy-load placeholder images (loader.gif) that the source emits
  // for not-yet-loaded media. They have no content value and render as a stray
  // spinner. Remove the img and any now-empty <picture>/<p> wrapper around it.
  main.querySelectorAll('img[src*="loader.gif"]').forEach((img) => {
    const picture = img.closest('picture');
    const wrapper = (picture || img).closest('p');
    (picture || img).remove();
    if (wrapper && wrapper.textContent.trim() === '' && !wrapper.querySelector('img, picture, a, svg')) {
      wrapper.remove();
    }
  });

  // Some pages leak the loader.gif (and other clientlib icon assets) as bare
  // anchor links to the asset URL rather than images. Drop those links; if that
  // empties their <li>/<p> wrapper, drop the wrapper too.
  main.querySelectorAll('a[href*="loader.gif"]').forEach((a) => {
    const wrapper = a.closest('li, p');
    a.remove();
    if (wrapper && wrapper.textContent.trim() === '' && !wrapper.querySelector('img, picture, a, svg')) {
      wrapper.remove();
    }
  });

  // Strip leaked markdown reference-definition junk: a malformed source list
  // sometimes flattens trailing `[imageN]: https://…asset` reference defs into
  // literal text. Remove that text run (and any element left empty) so it
  // doesn't render as a wall of stray URLs.
  // Reference-definition labels can run together with no whitespace
  // (`…next.svg[image14]: https://…prev.svg[image15]: https://…loader.gif`),
  // so the URL portion must stop before the next `[imageN]:` label, not just at
  // the next space.
  const IMG_REF_DEF = /\[image\d+\]:\s*https?:\/\/(?:(?!\[image\d+\]:).)*/gi;
  const IMG_REF_USE = /!\[[^\]]*\]\[image\d+\]/gi;
  const IMG_REF_TEST = /(\[image\d+\]:\s*https?:\/\/)|(!\[[^\]]*\]\[image\d+\])/i;
  const walker = document.createTreeWalker(main, 0x4 /* SHOW_TEXT */);
  const textNodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (IMG_REF_TEST.test(n.nodeValue)) textNodes.push(n);
  }
  textNodes.forEach((n) => {
    n.nodeValue = n.nodeValue.replace(IMG_REF_DEF, '').replace(IMG_REF_USE, '').trim();
    const el = n.parentElement;
    if (el && el.textContent.trim() === '' && !el.querySelector('img, picture, a, svg')) el.remove();
  });

  // 0-nav. strip the leaked desktop hero icon-nav. Many inner pages begin with
  // the source's mobile/desktop quick-nav (Home / Learn / Help / Get App) whose
  // icons are navigation/*-def.svg|-sel.svg links, plus stray "prev"/"next"
  // slider controls. These flatten into loose paragraphs at the top of the page
  // and render as junk links. Remove any paragraph whose only links point at the
  // navigation icon set, and the bare label/control paragraphs.
  const NAV_ICON_RE = /svg-icons\/navigation\/[^"']*-(def|sel)\.svg/i;
  const NAV_LABEL_RE = /^(Home|Learn|Help|Get App|prev|next)$/i;
  main.querySelectorAll('p').forEach((p) => {
    const t = p.textContent.trim();
    const hasNavIcon = [...p.querySelectorAll('img')].some((img) => NAV_ICON_RE.test(img.getAttribute('src') || ''));
    // icon paragraph: only an icon-nav link, no meaningful text
    if (hasNavIcon && t === '') { p.remove(); return; }
    // bare label paragraph that is a quick-nav item (often an empty-href link)
    if (NAV_LABEL_RE.test(t)) {
      const a = p.querySelector('a');
      const href = a ? (a.getAttribute('href') || '') : '';
      if (!a || href === '' || href === '/en/home.html' || NAV_LABEL_RE.test(t)) {
        // only strip when it's a standalone control/label, not body copy
        if (p.children.length <= 1 && t.length <= 10) p.remove();
      }
    }
  });

  // 0. strip leaked JS modal/disclaimer dialogs. The source renders hidden
  // redirect-disclaimer popups ("×" / "Disclaimer" / legal blurb / "Proceed"
  // | "I Accept") that flattened into loose paragraphs. Remove any paragraph
  // that is just a close glyph, the word "Disclaimer", or the disclaimer
  // sentence, plus their associated Proceed/I-Accept links.
  const DISCLAIMER_RE = /^(×|x|Disclaimer|Proceed|I Accept|Note: Available in select banks)/i;
  const LEAVE_SENTENCE = /you will be leaving|re-directed to a third party|Kotak Cards does not guarantee/i;
  main.querySelectorAll('p').forEach((p) => {
    const t = p.textContent.trim();
    if (DISCLAIMER_RE.test(t) || LEAVE_SENTENCE.test(t)) {
      // only strip the bare close glyph / disclaimer scaffolding, and the
      // redirect "Proceed"/"I Accept" CTA paragraphs that accompany them.
      if (t === '×' || t === 'x' || /^Disclaimer$/i.test(t) || LEAVE_SENTENCE.test(t)
          || (/^(Proceed|I Accept)$/i.test(t)) || /^Note: Available in select banks/i.test(t)) {
        p.remove();
      }
    }
  });

  // 1a. carousel-icons ("Need Help?") tiles: the source concatenates the tile
  // title and its description into one link with no delimiter (e.g.
  // "Visit Help CenterGet information on all topics"). Split each link's text
  // into a bold title line + a description line so they render on two lines,
  // matching the live tiles. Titles are a known fixed set.
  const ICON_TILE_TITLES = [
    'Visit Help Center', 'Contact us', 'Locate us', 'Report a fraud',
    'Lodge a complaint', 'Block lost/stolen card',
  ];
  main.querySelectorAll('div.carousel-icons a').forEach((a) => {
    const full = a.textContent.trim();
    const title = ICON_TILE_TITLES.find((t) => full.startsWith(t) && full.length > t.length);
    if (!title) return;
    const desc = full.slice(title.length).trim();
    a.textContent = title;
    const cell = a.closest('div');
    if (cell && desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      // place the description right after the link's paragraph
      const linkP = a.closest('p') || a;
      if (linkP.parentNode) linkP.parentNode.insertBefore(p, linkP.nextSibling);
    }
  });

  // 1. placeholder alt cleanup
  main.querySelectorAll('img[alt]').forEach((img) => {
    if (BAD_ALT.test(img.getAttribute('alt').trim())) {
      // try the nearest heading text in the same cell/anchor as a better alt
      const scope = img.closest('a, div, p, figure') || img.parentElement;
      const h = scope && scope.querySelector('h1,h2,h3,h4,h5,h6');
      img.setAttribute('alt', h ? h.textContent.trim().slice(0, 120) : '');
    }
  });

  // 1b. inject card images the scraper dropped: for each cards-* block, match
  // each card's heading to the recovered image URL and fill its empty image cell.
  main.querySelectorAll('div.cards-feature, div.cards-service, div.cards-contact, div.cards-milestone, div.cards-icon-tile').forEach((block) => {
    [...block.children].filter((r) => r.tagName === 'DIV').forEach((row) => {
      const cells = [...row.children].filter((c) => c.tagName === 'DIV');
      if (cells.length < 2) return;
      const imgCell = cells[0];
      if (imgCell.querySelector('img')) return; // already has an image
      const h = row.querySelector('h2, h3, h4, h5');
      if (!h) return;
      const heading = h.textContent.trim().replace(/\s+/g, ' ');
      const src = CARD_IMAGES[heading];
      if (!src) return;
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = src;
      img.alt = heading;
      img.loading = 'lazy';
      p.appendChild(img);
      imgCell.appendChild(p);
    });
  });

  // 1b2. The homepage's first product band is a randomized slider; the scrape
  // captured only 3 of its 6 cards. Append the recovered evergreen cards so the
  // band matches the live 6-card view. Keyed off the known first-card heading so
  // it only runs on that specific block.
  const EXTRA_PRODUCT_CARDS = [
    {
      subtitle: '811 SUPER',
      title: 'Backing you with every swipe',
      desc: 'Enjoy ₹6000 cashback every year',
      cta: 'Apply Now',
      href: 'https://www.kotak811.com/open-zero-balance-savings-account/811-super?utm_source=kotak_website_hp_featured_card&utm_medium=referral&utm_campaign=account_open',
      img: 'https://www.kotak.bank.in/content/dam/Kotak/feature-cards/811-super.jpeg.transform/transformer-width-737-height-414/image.jpeg',
    },
    {
      subtitle: 'HOME LOAN',
      title: 'Hassle Free Home Loans tailored for your needs!',
      desc: 'Kotak Home Loans upto 40 Cr* with a repayment tenure upto 25 years*',
      cta: 'Apply Now',
      href: 'https://homeloans.kotak.bank.in/loginDetail?flow=apply&pn=HL&cid=HL001&cName=HLProductPage_MainBanner&utm_source=organic&utm_medium=Website_Homepage&utm_campaign=Homepage_Featurecard&utm_content=Display&utm_term=HL001',
      img: 'https://www.kotak.bank.in/content/dam/Kotak/feature-cards/home-loan-feature-card.jpg.transform/transformer-width-737-height-414/image.jpg',
    },
    {
      subtitle: 'CREDIT CARDS',
      title: 'Enjoy exclusive offers with Kotak Credit Cards',
      desc: 'Rewards | Cashback | EMI Deals',
      cta: 'Apply Now',
      href: 'https://onboarding.kotak.bank.in/cc?utm_source=Organic&utm_medium=hpfeaturecard&utm_campaign=unifeaturecard',
      img: 'https://www.kotak.bank.in/content/dam/Kotak/feature-cards/cc-card-358-x-201.jpg.transform/transformer-width-737-height-414/image.jpg',
    },
  ];
  main.querySelectorAll('div.cards-feature').forEach((block) => {
    const firstHeading = block.querySelector('h4, h3');
    if (!firstHeading || firstHeading.textContent.trim() !== 'Power your entrepreneurial dreams') return;
    const existing = [...block.children].filter((c) => c.tagName === 'DIV').length;
    if (existing >= 6) return; // already complete
    EXTRA_PRODUCT_CARDS.forEach((c) => {
      const row = document.createElement('div');
      const imgCell = document.createElement('div');
      const imgP = document.createElement('p');
      const img = document.createElement('img');
      img.src = c.img; img.alt = c.title; img.loading = 'lazy';
      imgP.appendChild(img); imgCell.appendChild(imgP);
      const textCell = document.createElement('div');
      textCell.appendChild(document.createComment(' field:text '));
      const sub = document.createElement('p'); sub.textContent = c.subtitle;
      const h = document.createElement('h4'); h.textContent = c.title;
      const desc = document.createElement('p'); desc.textContent = c.desc;
      const ctaP = document.createElement('p');
      const a = document.createElement('a'); a.setAttribute('href', c.href); a.textContent = c.cta;
      ctaP.appendChild(a);
      textCell.append(sub, h, desc, ctaP);
      row.append(imgCell, textCell);
      block.appendChild(row);
    });
  });

  // 1b3. The customer-service "Download Forms" section was scraped as flat
  // default content (an <h2> followed by repeating <h4> + description <p> +
  // "Download forms" link <p>), so it renders as plain text with no cards or
  // images. Rebuild it as a cards-feature block and inject the recovered card
  // images so it matches the live image-card layout.
  const DOWNLOAD_FORM_IMAGES = {
    Personal: 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Insignia-Privy.jpg.transform/transformer-article-cards/image.jpg',
    Business: 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/edge_current_account.jpg.transform/transformer-article-cards/image.jpg',
    'Corporate & Institution': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Optima-Privy.jpg.transform/transformer-article-cards/image.jpg',
    NRI: 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/nro_rupee_savings_account.png.transform/transformer-article-cards/image.png',
  };
  const dfHeading = [...main.querySelectorAll('h2')].find((h) => h.textContent.trim() === 'Download Forms');
  if (dfHeading && !dfHeading.closest('div.cards-feature')) {
    // Collect the H4 card groups that follow, until the next H2.
    const cards = [];
    let node = dfHeading.nextElementSibling;
    const consumed = [];
    while (node && node.tagName !== 'H2') {
      const next = node.nextElementSibling;
      if (/^H[34]$/.test(node.tagName)) {
        const title = node.textContent.trim();
        const parts = [];
        let sib = next;
        while (sib && sib.tagName === 'P') {
          parts.push(sib);
          sib = sib.nextElementSibling;
        }
        if (DOWNLOAD_FORM_IMAGES[title] || parts.length) {
          cards.push({ title, parts });
          consumed.push(node, ...parts);
          node = sib;
          continue;
        }
      }
      node = next;
    }
    if (cards.length) {
      const block = document.createElement('div');
      block.className = 'cards-feature';
      cards.forEach((c) => {
        const row = document.createElement('div');
        const imgCell = document.createElement('div');
        const src = DOWNLOAD_FORM_IMAGES[c.title];
        if (src) {
          const imgP = document.createElement('p');
          const img = document.createElement('img');
          img.src = src; img.alt = c.title; img.loading = 'lazy';
          imgP.appendChild(img); imgCell.appendChild(imgP);
        }
        const textCell = document.createElement('div');
        textCell.appendChild(document.createComment(' field:text '));
        const h = document.createElement('h4'); h.textContent = c.title;
        textCell.appendChild(h);
        c.parts.forEach((p) => textCell.appendChild(p.cloneNode(true)));
        row.append(imgCell, textCell);
        block.appendChild(row);
      });
      consumed.forEach((el) => el.remove());
      dfHeading.parentNode.insertBefore(block, dfHeading.nextSibling);
    }
  }

  // 1b4. The "Important Customer Information" section was scraped as flat default
  // content: an <h2> followed by a plain <ul> whose <li>s each hold an icon link
  // and a text link. It renders as a bulleted list rather than the live tile
  // grid. Convert that <ul> into a cards-icon-tile block — one row per item,
  // cell 1 = icon image, cell 2 = label link — so it lays out as icon tiles.
  const iciHeading = [...main.querySelectorAll('h2')].find((h) => h.textContent.trim() === 'Important Customer Information');
  if (iciHeading) {
    let ul = iciHeading.nextElementSibling;
    while (ul && ul.tagName !== 'UL' && ul.tagName !== 'H2') ul = ul.nextElementSibling;
    if (ul && ul.tagName === 'UL' && !ul.closest('div.cards-icon-tile')) {
      const block = document.createElement('div');
      block.className = 'cards-icon-tile';
      [...ul.children].filter((li) => li.tagName === 'LI').forEach((li) => {
        const links = [...li.querySelectorAll('a')];
        const iconImg = li.querySelector('img');
        // the label link is the one with visible text
        const labelLink = links.find((a) => a.textContent.trim().length > 0);
        if (!labelLink) return;
        const row = document.createElement('div');
        const imgCell = document.createElement('div');
        if (iconImg) {
          const picture = document.createElement('picture');
          const img = document.createElement('img');
          // md2jcr's convertIcons rule turns any src ending in `.svg` into a
          // `:name:` icon token (which won't resolve for these external source
          // icons). Append a query so the URL no longer ends in `.svg`, keeping
          // it a real image; the server still serves the SVG.
          let iconSrc = iconImg.getAttribute('src') || '';
          if (/\.svg$/i.test(iconSrc)) iconSrc += '?icon';
          img.src = iconSrc;
          img.alt = labelLink.textContent.trim();
          img.loading = 'lazy';
          picture.appendChild(img);
          imgCell.appendChild(picture);
        }
        const textCell = document.createElement('div');
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.setAttribute('href', labelLink.getAttribute('href') || '');
        a.textContent = labelLink.textContent.trim();
        p.appendChild(a);
        textCell.appendChild(p);
        row.append(imgCell, textCell);
        block.appendChild(row);
      });
      if (block.children.length) {
        ul.parentNode.insertBefore(block, ul);
        ul.remove();
      }
    }
  }

  // 1b5. The "Welcome to Customer Service @ Kotak" section is flat default
  // content: an <h2> + intro <p>, then 4 contact-method groups, each
  // [icon <p>][title <p><strong><a>][description <p>]. It renders as a broken
  // stack with non-loading .svg icon tokens. Convert the 4 groups into a
  // cards-icon-tile block (icon + title link + description) and keep the SVG
  // icons as real images via the ?icon query.
  const welcomeHeading = [...main.querySelectorAll('h2')].find((h) => /^Welcome to Customer Service/i.test(h.textContent.trim()));
  if (welcomeHeading) {
    // Walk forward from the heading; the run ends at the next <h2>.
    const groups = [];
    const consumed = [];
    let node = welcomeHeading.nextElementSibling;
    let cur = null;
    while (node && node.tagName !== 'H2') {
      const next = node.nextElementSibling;
      const icon = node.tagName === 'P' && node.querySelector('img') && !node.querySelector('a') ? node.querySelector('img') : null;
      const titleLink = node.tagName === 'P' ? node.querySelector('strong > a, a strong, strong a') : null;
      if (icon) {
        // start a new card at each icon paragraph
        cur = { icon, title: null, href: '', desc: [] };
        groups.push(cur);
        consumed.push(node);
      } else if (cur && titleLink) {
        cur.title = titleLink.textContent.trim();
        const a = node.querySelector('a');
        cur.href = a ? (a.getAttribute('href') || '') : '';
        consumed.push(node);
      } else if (cur && node.tagName === 'P' && node.textContent.trim()) {
        cur.desc.push(node);
        consumed.push(node);
      }
      node = next;
    }
    const validGroups = groups.filter((g) => g.title);
    if (validGroups.length) {
      const block = document.createElement('div');
      block.className = 'cards-icon-tile';
      validGroups.forEach((g) => {
        const row = document.createElement('div');
        const imgCell = document.createElement('div');
        const picture = document.createElement('picture');
        const img = document.createElement('img');
        let iconSrc = g.icon.getAttribute('src') || '';
        if (/\.svg$/i.test(iconSrc)) iconSrc += '?icon';
        img.src = iconSrc;
        img.alt = '';
        img.loading = 'lazy';
        picture.appendChild(img);
        imgCell.appendChild(picture);
        const textCell = document.createElement('div');
        const tp = document.createElement('p');
        if (g.href) {
          const a = document.createElement('a');
          a.setAttribute('href', g.href);
          a.textContent = g.title;
          tp.appendChild(a);
        } else {
          const strong = document.createElement('strong');
          strong.textContent = g.title;
          tp.appendChild(strong);
        }
        textCell.appendChild(tp);
        g.desc.forEach((d) => textCell.appendChild(d.cloneNode(true)));
        row.append(imgCell, textCell);
        block.appendChild(row);
      });
      // insert the block after the intro paragraph (right before the first
      // consumed icon node) and remove the consumed loose elements.
      const firstConsumed = consumed[0];
      firstConsumed.parentNode.insertBefore(block, firstConsumed);
      consumed.forEach((el) => el.remove());
    }
  }

  // 1c. columns-media: md2jcr's columns handler drops images that are wrapped in
  // a link (<a><picture><img></picture></a>) and external — it emits an empty
  // button, losing the thumbnail. Unwrap such images to a standalone <picture>
  // (kept as the cell's first child) so the conversion preserves them.
  main.querySelectorAll('div.columns-media, div.columns-info').forEach((block) => {
    block.querySelectorAll('a img').forEach((img) => {
      const link = img.closest('a');
      const p = link.closest('p') || link.parentElement;
      const picture = document.createElement('picture');
      const newImg = document.createElement('img');
      newImg.src = img.getAttribute('src');
      newImg.alt = img.getAttribute('alt') || '';
      newImg.loading = 'lazy';
      picture.appendChild(newImg);
      const wrap = document.createElement('p');
      wrap.appendChild(picture);
      // place the standalone image just before the (now image-less) link paragraph
      if (p && p.parentNode) p.parentNode.insertBefore(wrap, p);
      // remove the emptied link wrapper to avoid a stray empty anchor
      if (link.textContent.trim() === '') link.remove();
    });
  });

  // 2. de-duplicate identical adjacent carousel slides (by normalized text)
  main.querySelectorAll('div.carousel-promo, div.carousel-icons, div.carousel-banner, div.carousel-gallery').forEach((car) => {
    const seen = new Set();
    [...car.children].filter((c) => c.tagName === 'DIV').forEach((slide) => {
      const key = slide.textContent.replace(/\s+/g, ' ').trim()
        + '|' + [...slide.querySelectorAll('img')].map((i) => i.getAttribute('src') || '').join(',');
      if (seen.has(key)) slide.remove();
      else seen.add(key);
    });
  });
}

// Junk text from the source desktop hero icon-nav / autoplay controls that
// leaked into the loose hero sequence.
const HERO_JUNK = /^(home|learn|help|get app|personal|business|nri|about us|prev|next|×|x|)$/i;

/**
 * The source homepage hero is a JS slider whose slides flattened into a loose
 * run of <h1>/<h2> + <p> + CTA <p> + image <p> elements at the very top of the
 * page (no block wrapper) — so it renders as a tall stack instead of one slide.
 *
 * Detect that leading run, group it into slides (each starts at a heading),
 * drop the junk/control elements, de-duplicate repeated slides (autoplay
 * clones), and replace the whole run with a `carousel-banner` block table:
 * one row per slide, cells = [image, heading+text+cta]. Returns true if it ran.
 */
function wrapLooseHero(document, blockMeta) {
  if (!blockMeta['carousel-banner']) return false;
  const main = document.querySelector('main') || document.body;
  const wrapper = main.querySelector('main > div, div');
  if (!wrapper) return false;
  const kids = [...wrapper.children];

  // The loose hero ends at the first real block div (e.g. .hero-promo/.cards-*).
  let end = kids.findIndex((el) => el.tagName === 'DIV' && el.classList.length === 1 && blockMeta[el.classList[0]]);
  if (end <= 0) return false;
  const run = kids.slice(0, end);
  // Only treat as hero if the run actually contains slide headings + images.
  const headingCount = run.filter((el) => /^H[12]$/.test(el.tagName)).length;
  if (headingCount < 1) return false;

  // Group into slides: a new slide starts at each H1/H2.
  const slides = [];
  let cur = null;
  run.forEach((el) => {
    const txt = el.textContent.trim().replace(/\s+/g, ' ');
    const img = el.querySelector('img');
    if (/^H[12]$/.test(el.tagName)) {
      cur = { heading: el, parts: [el], img: null };
      slides.push(cur);
    } else if (!cur) {
      // leading junk before first heading — skip
    } else if (img) {
      if (!cur.img) cur.img = img;
    } else if (!HERO_JUNK.test(txt)) {
      cur.parts.push(el);
    }
  });
  if (slides.length === 0) return false;

  // De-duplicate slides by heading text (autoplay clones repeat them).
  const seen = new Set();
  const unique = slides.filter((s) => {
    const key = s.heading.textContent.trim().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  // Build the carousel-banner authoring table: header + one row per slide,
  // each row = [ image cell , heading+text+cta cell ].
  const table = document.createElement('table');
  const htr = document.createElement('tr');
  const htd = document.createElement('td');
  htd.setAttribute('colspan', '2');
  htd.textContent = 'Carousel Banner';
  htr.appendChild(htd);
  table.appendChild(htr);

  unique.forEach((s) => {
    const tr = document.createElement('tr');
    const imgTd = document.createElement('td');
    if (s.img) {
      const p = document.createElement('p');
      p.appendChild(s.img.cloneNode(true));
      imgTd.appendChild(p);
    }
    const txtTd = document.createElement('td');
    s.parts.forEach((p) => txtTd.appendChild(p.cloneNode(true)));
    tr.appendChild(imgTd);
    tr.appendChild(txtTd);
    table.appendChild(tr);
  });

  // Remove the original loose run and insert the carousel at the top.
  run.forEach((el) => el.remove());
  wrapper.insertBefore(table, wrapper.firstChild);
  return true;
}

/**
 * The page's SEO metadata is authored as `<div class="metadata">` with
 * key/value rows (Title, Description, Image, og:title). md2jcr only lifts
 * metadata into page properties (jcr:title, jcr:description, …) when it sees a
 * block TABLE whose header cell is "Metadata"; a bare div is otherwise rendered
 * as visible body text. Convert each metadata div into that 2-column table so
 * the page-helper hoists it into <jcr:content> and drops it from the body.
 */
function convertMetadataToTable(document) {
  const main = document.querySelector('main') || document.body;
  main.querySelectorAll('div.metadata').forEach((meta) => {
    const rows = [...meta.children].filter((c) => c.tagName === 'DIV');
    const table = document.createElement('table');

    const headerTr = document.createElement('tr');
    const headerTd = document.createElement('td');
    headerTd.setAttribute('colspan', '2');
    headerTd.textContent = 'Metadata';
    headerTr.appendChild(headerTd);
    table.appendChild(headerTr);

    rows.forEach((row) => {
      const cells = [...row.children].filter((c) => c.tagName === 'DIV');
      const key = (cells[0] ? cells[0].textContent : '').trim();
      const tr = document.createElement('tr');
      const keyTd = document.createElement('td');
      keyTd.textContent = key;
      const valTd = document.createElement('td');
      if (cells[1]) while (cells[1].firstChild) valTd.appendChild(cells[1].firstChild);
      tr.appendChild(keyTd);
      tr.appendChild(valTd);
      table.appendChild(tr);
      // The importer's default rule auto-builds a Metadata block from the
      // document <title>; align it with the authored Title so jcr:title isn't
      // overwritten with the wrapper path.
      if (key.toLowerCase() === 'title') document.title = valTd.textContent.trim();
    });

    // replace the whole metadata block wrapper (outer div) with the table
    const wrapper = meta.parentElement && meta.parentElement.children.length === 1
      ? meta.parentElement : meta;
    wrapper.replaceWith(table);
  });
}

function convertBlockDivsToTables(document, blockMeta) {
  // Block divs carry exactly one class equal to a known component id. They are
  // nested inside section wrapper divs, so scan the whole document (not just
  // direct children of <main>). Skip the metadata div (handled separately).
  const main = document.querySelector('main') || document.body;
  const blockDivs = [...main.querySelectorAll('div')].filter((el) => el.classList.length === 1
    && blockMeta[el.classList[0]]
    && el.classList[0] !== 'metadata');

  blockDivs.forEach((blockDiv) => {
    const id = blockDiv.classList[0];
    const { title, simpleFields } = blockMeta[id];
    const rows = [...blockDiv.children].filter((c) => c.tagName === 'DIV');

    const table = document.createElement('table');
    const addHeader = (cols) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      if (cols > 1) td.setAttribute('colspan', String(cols));
      td.textContent = title;
      tr.appendChild(td);
      table.appendChild(tr);
    };

    if (simpleFields && simpleFields.length) {
      // SIMPLE block: md2jcr maps each stacked single-cell row positionally to a
      // model field. Use the `<!-- field:NAME -->` hints to place each authored
      // cell under its field, padding empty rows for absent fields so alignment
      // holds (e.g. a hero with only text still needs an empty image row first).
      addHeader(1);
      const cells = [];
      rows.forEach((row) => {
        const cs = [...row.children].filter((c) => c.tagName === 'DIV');
        (cs.length ? cs : [row]).forEach((cell) => cells.push(cell));
      });
      // bucket each cell by the field named in its first comment hint
      const byField = {};
      cells.forEach((cell) => {
        const walker = document.createTreeWalker(cell, 0x80 /* SHOW_COMMENT */);
        let fieldName = null;
        const cn = walker.nextNode();
        if (cn) {
          const m = cn.nodeValue.match(/field:\s*([a-zA-Z0-9_]+)/);
          if (m) fieldName = m[1];
        }
        if (!fieldName) fieldName = simpleFields[Object.keys(byField).length] || simpleFields[simpleFields.length - 1];
        (byField[fieldName] = byField[fieldName] || []).push(cell);
      });
      simpleFields.forEach((fname) => {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        (byField[fname] || []).forEach((cell) => {
          while (cell.firstChild) td.appendChild(cell.firstChild);
        });
        tr.appendChild(td);
        table.appendChild(tr);
      });
    } else {
      // CONTAINER / columns block: preserve the authored row/cell grid as-is.
      const maxCols = rows.reduce((m, r) => {
        const cs = [...r.children].filter((c) => c.tagName === 'DIV');
        return Math.max(m, cs.length || 1);
      }, 1);
      addHeader(maxCols);
      rows.forEach((row) => {
        const cs = [...row.children].filter((c) => c.tagName === 'DIV');
        const tr = document.createElement('tr');
        if (cs.length === 0) {
          const td = document.createElement('td');
          if (maxCols > 1) td.setAttribute('colspan', String(maxCols));
          while (row.firstChild) td.appendChild(row.firstChild);
          tr.appendChild(td);
        } else {
          cs.forEach((cell) => {
            const td = document.createElement('td');
            while (cell.firstChild) td.appendChild(cell.firstChild);
            tr.appendChild(td);
          });
        }
        table.appendChild(tr);
      });
    }

    blockDiv.replaceWith(table);
  });
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...await walk(full));
    else if (entry.endsWith('.plain.html')) out.push(full);
  }
  return out;
}

async function main() {
  const { components, blockMeta } = await loadComponents();
  await loadCardImages();
  const files = await walk(CONTENT_DIR);
  console.log(`Found ${files.length} content files`);
  let ok = 0; let blocky = 0; const failed = [];
  for (const file of files) {
    const rel = path.relative(CONTENT_DIR, file).replace(/\.plain\.html$/, '');
    const url = `https://main--ema-kmb-ue-test--bansaljitendra.aem.page/${rel}`;
    try {
      const fragment = await readFile(file, 'utf-8');
      // wrap fragment so the importer sees a full document with <main>
      const wrapped = `<!DOCTYPE html><html><head><title>${rel}</title></head><body><main>${fragment}</main></body></html>`;
      const opts = { createDocumentFromString: (s) => new JSDOM(s).window.document };

      // Default-content HTML: cleaned + metadata lifted, but no block tables.
      // Used by the fallback path so even pages whose blocks fail validation
      // still get metadata hoisted into page properties (not visible body text).
      const fallbackDom = new JSDOM(wrapped);
      normalizeContent(fallbackDom.window.document);
      convertMetadataToTable(fallbackDom.window.document);
      const fallbackHtml = fallbackDom.serialize();

      let result;
      let hadBlocks = false;
      try {
        // preprocess: convert EDS block divs into authoring tables md2jcr understands
        const dom = new JSDOM(wrapped);
        normalizeContent(dom.window.document);
        convertMetadataToTable(dom.window.document);
        // The loose hero-slider run only exists on the homepage; on other pages
        // the leading content is real default content (e.g. customer-service's
        // H1 hero + "Welcome" section), so only wrap it into a carousel there.
        if (rel === 'en/home') wrapLooseHero(dom.window.document, blockMeta);
        convertBlockDivsToTables(dom.window.document, blockMeta);
        hadBlocks = !!dom.window.document.querySelector('table');
        const html = dom.serialize();
        const res = await md2jcr(url, html, undefined, opts, { components });
        result = Array.isArray(res) ? res[0] : res;
        if (!result || !result.jcr) throw new Error('no jcr output');
      } catch (blockErr) {
        // Fallback: a block failed model validation. Render the page as default
        // content (no block tables) so it still produces valid JCR.
        const res = await md2jcr(url, fallbackHtml, undefined, opts, { components });
        result = Array.isArray(res) ? res[0] : res;
        if (!result || !result.jcr) throw blockErr;
        hadBlocks = false;
        failed.push(`${rel}: block fallback to default content (${blockErr.message.split('\n')[0]})`);
      }
      if (hadBlocks) blocky += 1;
      // md2jcr can leave bare '&' from URL query params; escape any '&' that
      // is not already part of a valid XML entity so the output is well-formed.
      const jcr = result.jcr.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
      const outPath = path.join(OUT_DIR, `${rel}.xml`);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, jcr);
      ok += 1;
    } catch (e) {
      failed.push(`${rel}: ${e.message}`);
    }
  }
  console.log(`\nConverted ${ok}/${files.length} to JCR XML (${blocky} contain block tables)`);
  if (failed.length) {
    console.log(`\nNotes (${failed.length}):`);
    failed.slice(0, 20).forEach((f) => console.log('  ' + f));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

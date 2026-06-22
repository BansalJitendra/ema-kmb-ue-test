import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * The credit-cards page ends with three link-list groups ("Credit Card
 * Services", "Credit Cards Guide", "What's New?") that were migrated as flat
 * default content (a heading <p> + a <ul> of icon links + a trailing "view all"
 * <p>). Group each into a row and wrap the trio in a `link-columns` block so
 * they render as three side-by-side cards like the live page.
 */
function buildLinkColumns(main) {
  const HEADERS = ['Credit Card Services', 'Credit Cards Guide', "What's New?", 'What’s New?'];
  const isHeader = (el) => el && el.tagName === 'P'
    && HEADERS.includes(el.textContent.trim());

  // Find header <p>s each immediately followed by a <ul>.
  const starts = [...main.querySelectorAll('p')].filter((p) => {
    const next = p.nextElementSibling;
    return isHeader(p) && next && next.tagName === 'UL';
  });
  if (starts.length < 2) return;

  // All groups must share a parent (the default-content wrapper) and be
  // consecutive enough to replace in place.
  const parent = starts[0].parentElement;
  if (!starts.every((p) => p.parentElement === parent)) return;

  const rows = [];
  starts.forEach((header) => {
    const headCell = document.createElement('div');
    const h = document.createElement('p');
    h.textContent = header.textContent.trim();
    headCell.append(h);

    const bodyCell = document.createElement('div');
    const ul = header.nextElementSibling;
    bodyCell.append(ul.cloneNode(true));
    // trailing "view all" link paragraph, if present
    const after = ul.nextElementSibling;
    if (after && after.tagName === 'P' && after.querySelector('a')) {
      bodyCell.append(after.cloneNode(true));
    }
    rows.push([headCell, bodyCell]);
  });

  // Build the block element: <div class="link-columns"><div><div>head</div><div>body</div></div>…
  const block = document.createElement('div');
  block.className = 'link-columns';
  rows.forEach(([head, body]) => {
    const row = document.createElement('div');
    row.append(head, body);
    block.append(row);
  });

  // Remove the original flat nodes (header, ul, optional view-all p) for each group.
  starts.forEach((header) => {
    const ul = header.nextElementSibling;
    const after = ul.nextElementSibling;
    if (after && after.tagName === 'P' && after.querySelector('a')) after.remove();
    ul.remove();
    header.remove();
  });

  // Insert the block where the first group was.
  parent.append(block);
}

// Headings that introduce an image-card catalog migrated as flat content
// (e.g. debit cards "Types of Debit cards", current accounts "Solutions built
// around your business"). Each catalog is grouped into a `card-catalog` grid.
const CARD_CATALOG_HEADINGS = [
  'Types of Debit cards',
  'Solutions built around your business',
];

/**
 * Card catalogs migrated as a flat stack of loose paragraphs/lists (per card:
 * one or two image <p>s, a title <p>, optional meta lines, a bullets <ul>, and
 * Apply Now / Know More link <p>s). Group each card into a row and wrap them in
 * a `card-catalog` block so they render as a grid like the live page. Strips the
 * leaked compare-tray controls ("Compare", "Add account for comparison", "Close
 * Compare…", and meta+Compare combined dupes) which are JS UI artifacts.
 */
function buildOneCardCatalog(heading) {
  const parent = heading.parentElement;
  const JUNK = /^(Compare|Add account for comparison|Close Compare.*|×)$/;

  const cards = [];
  const consumed = [];
  let cur = null;
  let node = heading.nextElementSibling;
  while (node) {
    const next = node.nextElementSibling;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const isImageP = node.tagName === 'P' && node.querySelector('picture, img') && !text;

    // The next section heading or a modal/disclaimer block ends the catalog.
    if (node.tagName === 'H2' || node.tagName === 'H1') break;
    if (node.tagName === 'P' && /^Disclaimer$/.test(text)) break;

    if (isImageP) {
      if (!cur || cur.body.length > 0) {
        cur = { image: node, body: [] };
        cards.push(cur);
      }
      consumed.push(node); // first image kept, extra leading images dropped
    } else if (cur) {
      // Drop standalone compare junk and the "<meta> Compare" combined dupe.
      if (node.tagName === 'P' && (JUNK.test(text) || /\bCompare$/.test(text))) {
        consumed.push(node);
      } else if (text || node.querySelector('a, li')) {
        cur.body.push(node);
        consumed.push(node);
      } else {
        consumed.push(node);
      }
    }
    node = next;
  }

  if (cards.length < 2) return;

  const block = document.createElement('div');
  block.className = 'card-catalog';
  cards.forEach((card) => {
    const row = document.createElement('div');
    const imgCell = document.createElement('div');
    imgCell.append(card.image.cloneNode(true));

    const bodyCell = document.createElement('div');
    const links = [];
    let noteAdded = false;
    card.body.forEach((el) => {
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      const clone = el.cloneNode(true);
      if (el.tagName === 'P' && /Discontinued from New Issuance/i.test(t)) {
        if (noteAdded) return;
        noteAdded = true;
        clone.className = 'card-catalog-note';
        clone.textContent = '(Discontinued from New Issuance)';
        bodyCell.append(clone);
      } else if (el.tagName === 'P' && el.querySelector('a')) {
        links.push(clone); // Know More / Apply Now / T&C apply
      } else {
        bodyCell.append(clone);
      }
    });
    if (links.length) {
      const linkRow = document.createElement('div');
      linkRow.className = 'card-catalog-links';
      links.forEach((l) => linkRow.append(l));
      bodyCell.append(linkRow);
    }

    row.append(imgCell, bodyCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

function buildCardCatalog(main) {
  [...main.querySelectorAll('h2')]
    .filter((h) => CARD_CATALOG_HEADINGS.includes(h.textContent.trim()))
    .forEach((h) => buildOneCardCatalog(h));
}

/**
 * FAQ sections migrated as flat content: each question is an <h2> whose text is
 * the (HTML-escaped) inert markup `<a href="javascript:;">Question</a>`,
 * followed by one or more <p> answer paragraphs. Pair each question with its
 * answer(s) into an `accordion` block (native <details>) so they expand/collapse
 * like live.
 */
function cleanFaqQuestion(text) {
  // strip a literal <a href="javascript:;">…</a> wrapper that survived as text
  return text
    .replace(/<a\s+href="javascript:;?"\s*>/i, '')
    .replace(/<\/a>/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFaqAccordion(main) {
  const faqHeading = [...main.querySelectorAll('h2')]
    .find((h) => h.textContent.trim() === 'Frequently Asked Questions');
  if (!faqHeading) return;
  const parent = faqHeading.parentElement;

  // A question heading is an <h2> whose text is the escaped javascript-link
  // markup (it renders as literal "<a href="javascript:;">Q</a>" text).
  const isQuestion = (el) => el && el.tagName === 'H2'
    && /<a\s+href="javascript:;?"/i.test(el.textContent);

  const rows = [];
  const consumed = [];
  let node = faqHeading.nextElementSibling;
  while (node) {
    const next = node.nextElementSibling;
    if (!isQuestion(node)) break; // end of the FAQ run
    const q = cleanFaqQuestion(node.textContent);
    consumed.push(node);
    // collect following answer paragraphs until the next question / heading
    const answer = [];
    let a = next;
    while (a && !isQuestion(a) && !/^H[1-3]$/.test(a.tagName)) {
      const nx = a.nextElementSibling;
      answer.push(a);
      consumed.push(a);
      a = nx;
    }
    rows.push({ q, answer });
    node = a;
  }

  if (rows.length < 2) return;

  const block = document.createElement('div');
  block.className = 'accordion';
  rows.forEach((row) => {
    const item = document.createElement('div');
    const label = document.createElement('div');
    label.textContent = row.q;
    const body = document.createElement('div');
    row.answer.forEach((p) => body.append(p.cloneNode(true)));
    item.append(label, body);
    block.append(item);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, faqHeading.nextSibling);
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildLinkColumns(main);
    buildCardCatalog(main);
    buildFaqAccordion(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Internal links migrated from the source site keep a `.html` extension (e.g.
 * /en/personal-banking/cards/credit-cards.html), but Edge Delivery serves pages
 * extensionless, so those links 404. Strip `.html` from internal page links
 * (root-relative or same-origin), preserving query strings and hashes. External
 * links and asset files (images, PDFs, etc.) are left untouched.
 */
export function stripHtmlExtensions(main) {
  const ASSET = /\.(jpe?g|png|gif|webp|svg|pdf|zip|docx?|xlsx?|pptx?|mp4|mov|json|xml|csv)$/i;
  main.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Only internal links: root-relative ("/en/…") or same-origin absolute.
    let isInternal = href.startsWith('/') && !href.startsWith('//');
    let url;
    if (!isInternal && /^https?:\/\//i.test(href)) {
      try {
        url = new URL(href);
        isInternal = url.origin === window.location.origin;
      } catch (e) {
        return;
      }
    }
    if (!isInternal) return;

    // Split off query/hash so we only touch the path.
    const hashIdx = href.indexOf('#');
    const queryIdx = href.indexOf('?');
    let cut = href.length;
    if (queryIdx !== -1) cut = Math.min(cut, queryIdx);
    if (hashIdx !== -1) cut = Math.min(cut, hashIdx);
    const path = href.slice(0, cut);
    const suffix = href.slice(cut);

    if (/\.html$/i.test(path) && !ASSET.test(path)) {
      a.setAttribute('href', path.replace(/\.html$/i, '') + suffix);
    }
  });
}

function a11yLinks(main) {
  const links = main.querySelectorAll('a');
  links.forEach((link) => {
    let label = link.textContent;
    if (!label && link.querySelector('span.icon')) {
      const icon = link.querySelector('span.icon');
      label = icon ? icon.classList[1]?.split('-')[1] : label;
    }
    link.setAttribute('aria-label', label);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  // migrated internal links carry .html which 404s on Edge Delivery — strip it
  stripHtmlExtensions(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  // add aria-label to links
  a11yLinks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    doc.body.dataset.breadcrumbs = true;
  }
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

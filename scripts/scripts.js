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
  const HEADERS = ['Credit Card Services', 'Credit Cards Guide', "What's New?", 'What’s New?',
    'Service Request', 'HelpCenter', 'Help Center', 'Learn all about Savings Account'];
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

  // Anchor the block at the first group's position (not the end of the wrapper,
  // which on pages like savings-account holds much more content after it).
  const anchor = starts[0];

  // Remove the original flat nodes (header, ul, optional view-all p) for each group.
  starts.forEach((header) => {
    const ul = header.nextElementSibling;
    const after = ul.nextElementSibling;
    if (after && after.tagName === 'P' && after.querySelector('a')) after.remove();
    ul.remove();
    if (header !== anchor) header.remove();
  });

  // Insert the block where the first group was, then drop the anchor header.
  parent.insertBefore(block, anchor);
  anchor.remove();
}

// Headings that introduce an image-card catalog migrated as flat content
// (e.g. debit cards "Types of Debit cards", current accounts "Solutions built
// around your business"). Each catalog is grouped into a `card-catalog` grid.
const CARD_CATALOG_HEADINGS = [
  'Types of Debit cards',
  'Solutions built around your business',
  'Types of Savings Accounts designed to meet your personalised goals',
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
  const JUNK = /^(Compare|Add account for comparison|Close Compare.*|×|Reset|Apply)$/;
  // Filter UI that precedes the cards on some catalogs (savings-account) — not a
  // card, just a leaked control row. Skip the "Choose a filter" heading and its
  // Reset/Apply controls until the first product card image.
  const isFilterControl = (el) => el.tagName === 'H5'
    || (el.tagName === 'P' && /^(Reset|Apply)$/.test(el.textContent.replace(/\s+/g, ' ').trim()));

  const cards = [];
  const consumed = [];
  let cur = null;
  let node = heading.nextElementSibling;
  while (node) {
    const next = node.nextElementSibling;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const isImageP = node.tagName === 'P' && node.querySelector('picture, img') && !text;
    // A new card begins at an image only once the current card already has a CTA
    // link; otherwise the image belongs to the current card.
    const curHasCta = cur && cur.body.some((b) => b.querySelector && b.querySelector('a[href]'));
    // Has the current card accumulated any text yet? Each source card leads with
    // two stacked images (thumbnail + an alternate wide banner that the live site
    // hides); both arrive before any text. Keep the first as the card image and
    // drop the alternate banner. Only images that appear AFTER text (e.g. the 811
    // offer badge) are real body images.
    const curHasText = cur && cur.body.some((b) => b.textContent.replace(/\s+/g, ' ').trim());

    // The next section heading or a modal/disclaimer block ends the catalog.
    if (node.tagName === 'H2' || node.tagName === 'H1') break;
    if (node.tagName === 'P' && /^Disclaimer$/.test(text)) break;

    if (!cur && isFilterControl(node)) {
      // Skip leaked filter controls that sit before the first card.
      consumed.push(node);
    } else if (isImageP) {
      if (!cur || curHasCta) {
        cur = { image: node, body: [] };
        cards.push(cur);
      } else if (curHasText) {
        cur.body.push(node); // mid-card image (e.g. offer badge) — keep in body
      }
      // else: leading alternate banner image — drop it (consumed only)
      consumed.push(node);
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
      const isImageOnly = el.tagName === 'P' && el.querySelector('picture, img') && !t;
      if (el.tagName === 'P' && /Discontinued from New Issuance/i.test(t)) {
        if (noteAdded) return;
        noteAdded = true;
        clone.className = 'card-catalog-note';
        clone.textContent = '(Discontinued from New Issuance)';
        bodyCell.append(clone);
      } else if (el.tagName === 'P' && el.querySelector('a')) {
        links.push(clone); // Know More / Apply Now / T&C apply
      } else if (isImageOnly) {
        // Body image paragraphs (e.g. the 811 offer callout) stack a decorative
        // background strip (empty alt) plus a meaningful badge. Live uses the
        // strip as a CSS background, so keep only non-decorative (alt'd) images.
        clone.querySelectorAll('picture, img').forEach((media) => {
          const im = media.tagName === 'IMG' ? media : media.querySelector('img');
          if (!im || !(im.getAttribute('alt') || '').trim()) {
            (im && im.closest('picture') ? im.closest('picture') : media).remove();
          }
        });
        if (clone.querySelector('img')) bodyCell.append(clone);
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
  const faqHeading = [...main.querySelectorAll('h2, h4')]
    .find((h) => h.textContent.trim() === 'Frequently Asked Questions');
  if (!faqHeading) return;
  const parent = faqHeading.parentElement;

  // Two migrated shapes:
  //  (a) savings/cards: question is an <h2> whose text is the escaped
  //      javascript-link markup (renders as literal "<a href="javascript:;">Q</a>").
  //  (b) car-loan calculator: question is a plain <h3>, answers are <p>s, each
  //      followed by a "Was this information helpful? Yes No" junk <p> and an
  //      empty javascript-link <p> to drop.
  const isLinkQuestion = (el) => el && el.tagName === 'H2'
    && /<a\s+href="javascript:;?"/i.test(el.textContent);
  const isPlainQuestion = (el) => el && el.tagName === 'H3' && el.textContent.trim();
  const isQuestion = (el) => isLinkQuestion(el) || isPlainQuestion(el);
  const isAnswerJunk = (el) => el && el.tagName === 'P'
    && (/^Was this information helpful/i.test(el.textContent.trim())
      || !el.textContent.trim());
  // A trailing "View All" link paragraph ends the FAQ run but is left in place
  // (it links to the full FAQ page, shown below the accordion on live).
  const isViewAll = (el) => el && el.tagName === 'P'
    && /^View All$/i.test(el.textContent.replace(/\s+/g, ' ').trim());

  const rows = [];
  const consumed = [];
  let node = faqHeading.nextElementSibling;
  while (node) {
    const next = node.nextElementSibling;
    if (!isQuestion(node)) break; // end of the FAQ run
    const q = isLinkQuestion(node)
      ? cleanFaqQuestion(node.textContent)
      : node.textContent.replace(/\s+/g, ' ').trim();
    consumed.push(node);
    // collect following answer paragraphs until the next question / heading,
    // dropping the "helpful?/Yes No" feedback junk.
    const answer = [];
    let a = next;
    while (a && !isQuestion(a) && !isViewAll(a) && !/^H[1-4]$/.test(a.tagName)) {
      const nx = a.nextElementSibling;
      if (!isAnswerJunk(a)) answer.push(a);
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

// Icon tokens (span.icon icon-NAME) used by the current-accounts grids, mapped
// to their original Kotak SVG URLs (EDS resolves the tokens to missing local
// /icons/*.svg). `icon-icon` is the generic account-variant glyph.
const GRID_ICONS = {
  'business-loan': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Business-Loan.svg',
  'payment-and-collection-solutions': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Payment-and-Collection-Solutions.svg',
  'trade-forex-solutions-04': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Trade-Forex-Solutions-04.svg',
  'pos-new': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/pos-new.svg',
  'activmoney-05': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/ActivMoney-05.svg',
  'biz-credit-card': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Biz-Credit-card.svg',
  'debit-card': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Debit-Card.svg',
  calculator: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/calculator.svg',
  'career-develop': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/careers/career-develop.svg',
  icon: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Icon.svg',
};

// Some grid tiles (e.g. the "Unlock exciting deals…" offer categories) have no
// icon token in the migrated content, so match their icon by label text.
const GRID_ICONS_BY_LABEL = {
  'Business Management & Marketing': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/business-mkt.png',
  'ERP & Accounting': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/erp.png',
  Logistics: 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/logistics.png',
  'Human Resource': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/human-resource.png',
  'Business Travel': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/business-travel.png',
  'Co-working space': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/co-working.png',
  'Taxation & Legal': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/tax.png',
  'Healthcare Solutions': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/healthcare.png',
  'Industry Insights': 'https://www.kotak.bank.in/content/dam/Kotak/png-icons/industry-insights.png',
  // "Current Accounts for every business need" product tabs (card thumbnails)
  'Solitaire Business': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/solitaire-business-t.jpg',
  'Privy+ Business': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/privy-plus-ca.jpg',
  'Privy Business': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/privy-ca.jpg',
  'Pro Business': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/pro-business-tn.jpg',
  // "Solutions for your Business" tiles
  Loans: 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Loans.jpg',
  'Point of Sale (POS) Machine': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Point-of-Sale.jpg',
  'Trade Forex Solutions': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Trade-and-Forex.jpg',
  'Exclusive Offers for your business': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/Offers-Beyond-Banking.jpg',
};

// Tokenized icons (span.icon icon-NAME) outside the grid builders that EDS
// resolves to missing local /icons/*.svg. Maps each token to its real Kotak SVG
// (e.g. savings-account "Why choose" feature tiles and offer glyphs).
const ICON_FIX = {
  'sa-interest-icon': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/saving-account/sa-interest-icon.svg',
  account: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/account.svg',
  'zero-balance-account': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Zero_Balance_Account.svg',
  lifestyle: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/lifestyle.svg',
  offer: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/loans/personal-loan/Offer.svg',
  'sa-choice-option-icon': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/saving-account/sa-choice-option-icon.svg',
  'sa-needs-option-icon': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/saving-account/sa-needs-option-icon.svg',
  healthcare: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/Healthcare.svg',
  apply: 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/apply.svg',
  'icn-protect-ride': 'https://www.kotak.bank.in/content/dam/Kotak/Insurance/icn-protect-ride.svg',
  'buy-a-car-for-whitebg': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/retail-journey/Buy-a-Car-for-whitebg.svg',
  'cc-step-1': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-1.svg',
  'cc-step-2': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-2.svg',
  'cc-step-3': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-3.svg',
};

function iconImg(url) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

// Rewrite tokenized icons whose token is in ICON_FIX so they point at the real
// Kotak SVG instead of the 404ing local /icons/NAME.svg.
function fixTokenizedIcons(main) {
  main.querySelectorAll('span.icon').forEach((span) => {
    const cls = [...span.classList].find((c) => c.startsWith('icon-'));
    const token = cls ? cls.slice(5) : null;
    const url = token && ICON_FIX[token];
    if (!url) return;
    const img = span.querySelector('img') || document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    if (!img.parentNode) span.appendChild(img);
  });
  // Broken <img src="/icons/NAME.svg"> (no span token) that resolve to missing
  // local files — rewrite to the real Kotak SVG when the token is mapped.
  main.querySelectorAll('img[src*="/icons/"]').forEach((img) => {
    const m = (img.getAttribute('src') || '').match(/\/icons\/([^/.]+)\.svg/);
    const url = m && ICON_FIX[m[1]];
    if (url) img.src = url;
  });
}

// The savings-account "Benefits of Kotak Savings Account" section imported as a
// `carousel-promo` (built for wide banner artwork), but on the live site it's a
// row of centered icon tiles — a circular icon with the benefit caption below.
// Each imported slide row is [icon cell][empty cell]; the caption text was lost.
// Rebuild it as a `feature-row` block (icon + caption tiles) keyed by icon name,
// and prepend the dropped section heading.
const BENEFITS_CAPTIONS = {
  'sa-interest-icon': 'Earn FD-like interest in your Savings Account!',
  offer: 'Everyday offers on shopping, dining, travel and more',
  'sa-choice-option-icon': 'Range of Savings Account designed to fit your specific requirements',
  'sa-needs-option-icon': '24x7 convenience banking: Your bank, your time',
  healthcare: 'Health insurance benefits',
};
function restoreBenefitsCarousel(main) {
  const promo = main.querySelector('.carousel-promo');
  if (!promo) return;
  const rows = [...promo.querySelectorAll(':scope > div')];
  if (rows.length < 2) return;

  const items = [];
  rows.forEach((row) => {
    const img = row.querySelector('img');
    const src = (img && img.getAttribute('src')) || '';
    if (!img) return;
    const key = Object.keys(BENEFITS_CAPTIONS)
      .find((k) => new RegExp(k.replace(/-/g, '[-_]?'), 'i').test(src));
    items.push({ img, caption: key ? BENEFITS_CAPTIONS[key] : '' });
  });
  if (items.length < 2) return;

  // Build a feature-row block: each tile is an icon cell + a caption text cell.
  const block = document.createElement('div');
  block.className = 'feature-row feature-row-benefits';
  items.forEach((it) => {
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    iconCell.append(it.img.cloneNode(true));
    const textCell = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = it.caption;
    textCell.append(p);
    row.append(iconCell, textCell);
    block.append(row);
  });

  // Prepend the dropped section heading, then swap the carousel for the tiles.
  const prev = promo.previousElementSibling;
  if (!prev || !/Benefits of Kotak Savings Account/i.test(prev.textContent)) {
    const h2 = document.createElement('h2');
    h2.id = 'benefits-of-kotak-savings-account';
    h2.textContent = 'Benefits of Kotak Savings Account';
    promo.parentElement.insertBefore(h2, promo);
  }
  promo.replaceWith(block);
}

// "Explore other savings account options for existing Kotak Bank customers"
// migrated as pairs of <p><a>(thumbnail)</a></p> + <p><a>Variant Name</a></p>,
// but decorateButtons strips the image from the empty thumbnail link, leaving
// plain text links. Live shows small product-thumbnail tiles with the name
// below. Rebuild as an `icon-grid` of image tiles, keyed by the variant's href
// slug to its thumbnail (the source images, recovered by slug).
const EXPLORE_THUMBS = {
  'pro-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/Kotak-Pro-Savings-Account-Thumb.jpg',
  'edge-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/Kotak-Edge-Savings_thumb.jpg',
  'classic-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/classic-savings-account.png',
  'nova-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/Recycle-Bin/Herobanner/Kotak-Nova-Savings-Account-Thumb.jpg',
  'platina-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/platina_savings_account.png',
  'alpha-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/journey-adapts/alpha-savings-and-investments-programme.png',
  'jifi-discontinued': 'https://www.kotak.bank.in/content/dam/Kotak/Product-Card-Images-Mobile/jifi-saving-account.png',
  'ace-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/ace-t.jpg',
  'everyday-saving-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/everyday-t.jpg',
  'my-family-savings-account': 'https://www.kotak.bank.in/content/dam/Kotak/product_card_images/my-family-savings-account.jpg',
};
function buildExploreVariants(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => /^Explore other savings account options/i.test(h.textContent.replace(/\s+/g, ' ').trim()));
  if (!heading) return;
  const parent = heading.parentElement;

  const items = [];
  const consumed = [];
  let node = heading.nextElementSibling;
  while (node && node.tagName !== 'H2') {
    const next = node.nextElementSibling;
    const a = node.tagName === 'P' ? node.querySelector('a[href]') : null;
    const label = a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
    if (a) {
      const href = a.getAttribute('href') || '';
      const slug = href.replace(/\.html$/, '').split('/').pop();
      if (label) {
        // a named variant link — pair with the preceding (image) link if same slug
        const prev = items.length ? items[items.length - 1] : null;
        if (prev && !prev.label && prev.slug === slug) {
          prev.label = label;
        } else {
          items.push({ slug, href, label });
        }
      } else {
        // image-only link (thumbnail was stripped) — start a tile
        items.push({ slug, href, label: '' });
      }
      consumed.push(node);
    } else {
      // keep the intro disclaimer paragraph; stop consuming it
      consumed.push(node);
    }
    node = next;
  }

  const tiles = items.filter((it) => it.label && EXPLORE_THUMBS[it.slug]);
  if (tiles.length < 3) return;

  const block = document.createElement('div');
  block.className = 'icon-grid icon-grid-variants';
  tiles.forEach((it) => {
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    const img = document.createElement('img');
    img.src = EXPLORE_THUMBS[it.slug];
    img.alt = it.label;
    img.loading = 'lazy';
    iconCell.append(img);
    const labelCell = document.createElement('div');
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', it.href);
    link.textContent = it.label;
    p.append(link);
    labelCell.append(p);
    row.append(iconCell, labelCell);
    block.append(row);
  });

  // Remove the consumed links but keep the disclaimer paragraph in place.
  consumed.forEach((el) => {
    if (!/no longer available/i.test(el.textContent)) el.remove();
  });
  parent.insertBefore(block, heading.nextSibling);
}

/**
 * The car-loan EMI calculator migrated as static content: an intro marker
 * ("Calculate your EMI instantly!"), three input labels each followed by a
 * slider-tick paragraph, and a frozen result block. There's no interactivity.
 * Replace that static run with an interactive `emi-calculator` block whose
 * config (min/max/step + defaults) is read from the migrated slider ticks, so
 * the EMI recomputes live like the source page.
 */
function buildEmiCalculator(main) {
  const marker = [...main.querySelectorAll('p')]
    .find((p) => /^Calculate your EMI instantly!?$/i.test(p.textContent.trim()));
  if (!marker) return;
  const parent = marker.parentElement;

  // Walk from the marker to the result's last value ("Total Amount Payable").
  // Collect text content for config extraction and mark nodes for removal. The
  // amount tick paragraph is a run of "<n>L" tokens (e.g. "1L26L51L76L100L");
  // the rate tick is a bare run of numbers (e.g. "89101112…24"). The decorative
  // handle.png images may be stripped by image processing, so match by text.
  const consumed = [marker];
  let amountText = '';
  let rateText = '';
  let applyHref = '';
  let node = marker.nextElementSibling;
  let reachedResult = false;
  while (node) {
    const t = node.textContent.replace(/\s+/g, ' ').trim();
    const next = node.nextElementSibling;
    if (node.tagName === 'H2' || node.tagName === 'H1' || node.tagName === 'H4') break;
    consumed.push(node);
    if (!amountText && /^(\d+L){2,}$/.test(t)) {
      amountText = t;
    } else if (amountText && !rateText && /^\d{6,}$/.test(t)) {
      rateText = t;
    }
    const a = node.querySelector && node.querySelector('a[href]');
    if (a && /Apply Now/i.test(a.textContent)) applyHref = a.getAttribute('href') || '';
    if (/Total Amount Payable/i.test(t)) reachedResult = true;
    // Stop after the result's total value + its Apply Now button.
    if (reachedResult && a && /Apply Now/i.test(a.textContent)) break;
    node = next;
  }
  if (!amountText) return;

  // Parse slider scales. Amount ticks like "1L26L51L76L100L" → 1L..100L.
  const lakhs = amountText.match(/(\d+)L/g) || [];
  const amountScaleMin = lakhs[0] || '1L';
  const amountScaleMax = lakhs[lakhs.length - 1] || '100L';
  const toRupees = (l) => parseInt(l, 10) * 100000;
  const amountMin = toRupees(amountScaleMin);
  const amountMax = toRupees(amountScaleMax);
  // Rate ticks "89101112…24" — first is min (8), last two digits are max (24).
  const rateNums = rateText.replace(/[^0-9]/g, '');
  const rateMin = Number(rateNums.slice(0, 1)) || 8;
  const rateMax = Number(rateNums.slice(-2)) || 24;

  const block = document.createElement('div');
  block.className = 'emi-calculator';
  block.dataset.amount = '5000000';
  block.dataset.amountMin = String(amountMin);
  block.dataset.amountMax = String(amountMax);
  block.dataset.amountStep = '50000';
  block.dataset.amountScaleMin = amountScaleMin;
  block.dataset.amountScaleMax = amountScaleMax;
  block.dataset.rate = String(rateMin);
  block.dataset.rateMin = String(rateMin);
  block.dataset.rateMax = String(rateMax);
  block.dataset.rateStep = '1';
  block.dataset.tenure = '5';
  block.dataset.tenureMin = '1';
  block.dataset.tenureMax = '7';
  block.dataset.tenureStep = '1';
  block.dataset.tenureUnit = 'Years';
  if (applyHref) block.dataset.applyHref = applyHref;

  // Capture a stable insertion anchor (the first node after the consumed run
  // that is NOT itself being removed) before detaching anything, so insertBefore
  // never references a removed node.
  const consumedSet = new Set(consumed);
  let anchor = node;
  while (anchor && consumedSet.has(anchor)) anchor = anchor.nextElementSibling;
  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, anchor && anchor.parentElement === parent ? anchor : null);
}

// Resolve a tokenized icon (<span class="icon icon-NAME">) or a broken
// /icons/NAME.svg <img> inside `el` to a real Kotak SVG <img>. Returns the img
// or null.
function resolveGridIcon(el) {
  if (!el) return null;
  let token = null;
  const span = el.querySelector('span.icon');
  const img = el.querySelector('img');
  if (span) {
    const cls = [...span.classList].find((c) => c.startsWith('icon-'));
    token = cls ? cls.slice(5) : null;
  } else if (img) {
    const m = (img.getAttribute('src') || '').match(/\/icons\/([^/.]+)\.svg/);
    token = m ? m[1] : null;
  }
  const url = token && GRID_ICONS[token];
  if (!url) return null;
  const out = document.createElement('img');
  out.src = url;
  out.alt = '';
  out.loading = 'lazy';
  return out;
}

// Headings whose following content is a flat run of icon-link pairs
// (<p><a>(icon)</a></p> + <p><a>label</a></p>) — rendered as an icon-tile grid.
const ICON_GRID_HEADINGS = [
  'Current Accounts for every business need',
  'Additional Current Account variants unavailable for new Current Account opening',
  'Solutions for your Business',
  'Unlock exciting deals & discounts with your Kotak Current Account',
];

function buildOneIconGrid(heading) {
  const parent = heading.parentElement;
  // Collect the run of <p> siblings (each holding a single <a>) until the next
  // heading. Items come in pairs: an icon link <p> then a label link <p> with
  // the same href; some sections omit the icon <p>.
  const items = [];
  const consumed = [];
  let node = heading.nextElementSibling;
  while (node && !/^H[1-4]$/.test(node.tagName)) {
    const next = node.nextElementSibling;
    if (node.tagName === 'P' && node.querySelector('a[href]')) {
      consumed.push(node);
      const a = node.querySelector('a[href]');
      const href = a.getAttribute('href');
      const label = a.textContent.replace(/\s+/g, ' ').trim();
      const icon = resolveGridIcon(node);
      const prev = items.length ? items[items.length - 1] : null;
      const isLong = label && label.split(' ').length > 6;
      if (isLong && prev && prev.href === href && prev.label) {
        // a long link with the same href as the current tile is its description
        prev.desc = label;
      } else if (isLong) {
        // a stray long sentence not tied to a tile — drop it (consumed)
      } else if (label) {
        // a label paragraph — pair with the preceding icon-only paragraph
        if (prev && !prev.label && prev.href === href) {
          prev.label = label;
        } else {
          items.push({ href, label, icon });
        }
      } else {
        // an icon-only paragraph — start a new item
        items.push({ href, label: '', icon });
      }
    } else if (node.tagName === 'P' && !node.textContent.trim()) {
      consumed.push(node); // stray empty paragraph
    } else {
      break; // non-link content ends the grid
    }
    node = next;
  }

  const tiles = items.filter((it) => it.label);
  if (tiles.length < 3) return;

  const block = document.createElement('div');
  block.className = 'icon-grid';
  tiles.forEach((it) => {
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    const byLabel = GRID_ICONS_BY_LABEL[it.label];
    const icon = it.icon || (byLabel ? iconImg(byLabel) : null);
    if (icon) iconCell.append(icon);
    const labelCell = document.createElement('div');
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', it.href);
    a.textContent = it.label;
    p.append(a);
    labelCell.append(p);
    if (it.desc) {
      const d = document.createElement('p');
      d.className = 'icon-grid-desc';
      d.textContent = it.desc;
      labelCell.append(d);
    }
    row.append(iconCell, labelCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

function buildIconGrids(main) {
  [...main.querySelectorAll('h2')]
    .filter((h) => ICON_GRID_HEADINGS.includes(h.textContent.replace(/\s+/g, ' ').trim()))
    .forEach((h) => buildOneIconGrid(h));
}

/**
 * "Related Products" migrated as a flat run of <h4>title + <p>desc + <p><a>Know
 * more</a> groups. Wrap them in a `card-catalog`-style grid (reusing its CSS) so
 * they render as product cards like live.
 */
function buildRelatedProducts(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => h.textContent.replace(/\s+/g, ' ').trim() === 'Related Products');
  if (!heading) return;
  const parent = heading.parentElement;

  const cards = [];
  const consumed = [];
  let cur = null;
  let node = heading.nextElementSibling;
  while (node && node.tagName !== 'H2') {
    const next = node.nextElementSibling;
    if (node.tagName === 'H4') {
      cur = { title: node, body: [] };
      cards.push(cur);
      consumed.push(node);
    } else if (cur && (node.textContent.trim() || node.querySelector('a'))) {
      cur.body.push(node);
      consumed.push(node);
    } else {
      consumed.push(node);
    }
    node = next;
  }

  if (cards.length < 2) return;

  const block = document.createElement('div');
  block.className = 'card-catalog cards-text-only';
  cards.forEach((card) => {
    const row = document.createElement('div');
    const bodyCell = document.createElement('div');
    bodyCell.append(card.title.cloneNode(true));
    const links = [];
    card.body.forEach((el) => {
      const clone = el.cloneNode(true);
      if (el.tagName === 'P' && el.querySelector('a')) links.push(clone);
      else bodyCell.append(clone);
    });
    if (links.length) {
      const linkRow = document.createElement('div');
      linkRow.className = 'card-catalog-links';
      links.forEach((l) => linkRow.append(l));
      bodyCell.append(linkRow);
    }
    row.append(bodyCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

// Offer thumbnails for the "Saving Accounts offers you don't want to miss!"
// cards. The migrated content has no images (live loads them from a deals API),
// so map each offer title to its real Kotak thumbnail URL.
const OFFER_IMAGES = {
  Cleartax: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/clear-tax-t.jpg',
  'Reliance Digital': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/reliance-offer-thumbnail.jpg',
  'Eco Mobility': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/eco-mobility-t.jpg',
  Amazon: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/amazon-offer-t.jpg',
  Canon: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/canon-t.jpg',
  Yatra: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/yatra-t.jpg',
  'Paytm Flights': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/paytm-flights-t.jpg',
  Ixigo: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/travel-offer/Ixigo-t.jpg',
  Ather: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/atheroffer-t.jpg',
  Godrej: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/electronics/godrej-t.jpg',
  'Hero Motorbikes': 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/memi-two-wheeler-t.jpg',
  KTM: 'https://www.kotak.bank.in/content/dam/Kotak/deals-offers/others/ktmoffer-t.jpg',
};

/**
 * "Saving Accounts offers you don't want to miss!" migrated as a flat run of
 * <p>Just Added</p> badge + <h4>title + <p>desc + <p>Valid Till…</p> +
 * <p><a>Read More</a></p> groups (no images — live loads them dynamically).
 * Group each offer into a card (thumbnail + badge + title + desc + Valid Till +
 * Read More) and wrap them in a `card-catalog` grid like the live offer cards.
 * Drops the leaked prev/next nav.
 */
function buildOffers(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => /^Saving Accounts offers you/i.test(h.textContent.replace(/\s+/g, ' ').trim()));
  if (!heading) return;
  const parent = heading.parentElement;

  const cards = [];
  const consumed = [];
  let cur = null;
  let node = heading.nextElementSibling;
  while (node && node.tagName !== 'H2') {
    const next = node.nextElementSibling;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const isNav = node.tagName === 'P' && /^(prev|next)$/i.test(text);
    const isNavImg = node.tagName === 'P' && node.querySelector('img')
      && /svg-icon\/(next|prev)/.test(node.querySelector('img').getAttribute('src') || '');
    if (node.tagName === 'H4') {
      cur = { title: node, badge: null, body: [] };
      cards.push(cur);
      consumed.push(node);
    } else if (node.tagName === 'P' && /^Just Added$/i.test(text)) {
      // badge precedes the next h4 — stash it on a pending holder
      consumed.push(node);
      cur = null; // ensure the badge isn't attached to the previous card's body
      cards.push({
        title: null, badge: text, body: [], pendingBadge: true,
      });
    } else if (isNav || isNavImg) {
      consumed.push(node); // leaked carousel nav
    } else if (cur && (text || node.querySelector('a'))) {
      cur.body.push(node);
      consumed.push(node);
    } else {
      consumed.push(node);
    }
    node = next;
  }

  // Merge pending badges into the following card (the h4 that comes after it).
  const merged = [];
  for (let i = 0; i < cards.length; i += 1) {
    const c = cards[i];
    if (c.pendingBadge) {
      const nextCard = cards[i + 1];
      if (nextCard && nextCard.title) {
        nextCard.badge = c.badge;
        merged.push(nextCard);
        i += 1;
      }
    } else if (c.title) {
      merged.push(c);
    }
  }
  if (merged.length < 2) return;

  const block = document.createElement('div');
  block.className = 'card-catalog cards-offers';
  merged.forEach((card) => {
    const row = document.createElement('div');
    const titleText = card.title.textContent.replace(/\s+/g, ' ').trim();
    const imgUrl = OFFER_IMAGES[titleText];
    if (imgUrl) {
      const imgCell = document.createElement('div');
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = titleText;
      img.loading = 'lazy';
      p.append(img);
      imgCell.append(p);
      row.append(imgCell);
    }
    const bodyCell = document.createElement('div');
    if (card.badge) {
      const badge = document.createElement('p');
      badge.className = 'card-catalog-badge';
      badge.textContent = card.badge;
      bodyCell.append(badge);
    }
    bodyCell.append(card.title.cloneNode(true));
    const links = [];
    card.body.forEach((el) => {
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      const clone = el.cloneNode(true);
      if (el.tagName === 'P' && el.querySelector('a')) {
        links.push(clone);
      } else if (/^Valid Till/i.test(t)) {
        clone.className = 'card-catalog-valid';
        bodyCell.append(clone);
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
    row.append(bodyCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

/**
 * The savings-account hero is a banner slider whose source HTML duplicated each
 * slide 6 times (slick carousel clones captured statically), so the migrated
 * content renders the two banner images stacked and repeated. Collapse it into a
 * clean `carousel-banner` block: one slide per unique banner image. In the
 * source each slide's caption text PRECEDES its banner image, so the text
 * buffered before an image belongs to that image's slide. Slides are deduped by
 * image src so the 6 repeats become the 2 real slides.
 */
function buildSavingsHero(main) {
  // Savings-account hero only: the source duplicated each slide 6x and this
  // builder collapses them. Other pages (e.g. the car-loan EMI calculator) also
  // carry a herosliderbanner image but a different layout, so scope strictly to
  // the savings-account page to avoid clobbering/crashing those pages.
  if (!/\/savings-account(\/|$)/.test(window.location.pathname)) return;

  // Runs before decorateSections, so `.default-content-wrapper` doesn't exist
  // yet — locate the hero by its banner image (herosliderbanner / ingested
  // media_) and use that image paragraph's parent (the section div) as the wrap.
  const isBanner = (el) => el && el.tagName === 'P' && el.querySelector('img')
    && /herosliderbanner|media_/.test(el.querySelector('img').getAttribute('src') || '');
  const firstBanner = [...main.querySelectorAll('p')].find(isBanner);
  if (!firstBanner) return;
  const wrap = firstBanner.parentElement;
  if (!wrap) return;
  // The hero ends at the first <h1> (the "Open Savings Account Online" intro).
  // Only use it as an insert anchor if it's a direct child of wrap; otherwise
  // insertBefore would throw NotFoundError.
  const h1 = wrap.querySelector('h1');
  const endEl = h1 && h1.parentElement === wrap ? h1 : null;

  // Walk the hero region. Buffer caption text/CTAs; when a unique banner image
  // is reached, that buffer becomes the slide body. Duplicate images (slick
  // clones) and their preceding buffers are dropped.
  const slides = [];
  const consumed = [];
  const seenImg = new Set();
  let buffer = [];
  let node = wrap.firstElementChild;
  while (node && node !== endEl) {
    const next = node.nextElementSibling;
    const img = node.querySelector && node.querySelector('img');
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const isBannerImg = node.tagName === 'P' && img
      && /herosliderbanner|media_/.test(img.getAttribute('src') || '');
    const isNavJunk = node.tagName === 'P'
      && (/^(prev|next|×)$/i.test(text) || (img && /svg-icon\/(next|prev)/.test(img.getAttribute('src') || '')))
      && !node.querySelector('a[href]:not([href=""])');

    if (isBannerImg) {
      const src = img.getAttribute('src');
      if (seenImg.has(src)) {
        buffer.forEach((b) => consumed.push(b)); // duplicate slide clone — drop
      } else {
        seenImg.add(src);
        slides.push({ image: node, body: buffer });
      }
      consumed.push(node);
      buffer = [];
    } else if (isNavJunk) {
      consumed.push(node);
    } else if (text || node.querySelector('a[href]:not([href=""])')) {
      buffer.push(node); // caption text/CTA for the upcoming image
    } else {
      consumed.push(node);
    }
    node = next;
  }

  if (slides.length < 1) return;

  const block = document.createElement('div');
  block.className = 'carousel-banner';
  slides.forEach((slide) => {
    const row = document.createElement('div');
    const imgCell = document.createElement('div');
    imgCell.append(slide.image.querySelector('picture, img').cloneNode(true));
    const contentCell = document.createElement('div');
    slide.body.forEach((el) => {
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      if (!t && !el.querySelector('a[href]:not([href=""]), img')) return;
      contentCell.append(el.cloneNode(true));
      consumed.push(el);
    });
    row.append(imgCell, contentCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  wrap.insertBefore(block, endEl || wrap.firstChild);
}

/**
 * The current-accounts "One Current Account, many robust offerings" section
 * migrated as an intro <p> then pairs of <p>icon</p> + <p><strong>Label</strong>
 * <br>desc</p> (Loans, POS/QR/UPI, Payment & Collection, Trade Forex), plus
 * leaked icon-next/icon-prev carousel-nav <p>s. Group the pairs into a
 * `feature-row` block and drop the nav junk.
 */
function buildFeatureRow(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => h.textContent.replace(/\s+/g, ' ').trim() === 'One Current Account, many robust offerings');
  if (!heading) return;
  const parent = heading.parentElement;

  const isIconP = (el) => el && el.tagName === 'P' && el.querySelector('span.icon, picture, img')
    && !el.textContent.trim();
  const isNavJunk = (el) => el && el.tagName === 'P'
    && [...el.querySelectorAll('span.icon')].every((s) => /icon-(next|prev)/.test(s.className))
    && el.querySelector('span.icon') && !el.textContent.trim();

  const items = [];
  const consumed = [];
  let node = heading.nextElementSibling;
  // skip the intro paragraph(s) until the first icon paragraph
  while (node && node.tagName !== 'H2') {
    let advance = node.nextElementSibling;
    if (isNavJunk(node)) {
      consumed.push(node);
    } else if (isIconP(node)) {
      const labelP = node.nextElementSibling;
      if (labelP && labelP.tagName === 'P' && labelP.querySelector('strong')) {
        items.push({ icon: node, text: labelP });
        consumed.push(node, labelP);
        advance = labelP.nextElementSibling;
      }
    }
    node = advance;
  }

  if (items.length < 2) return;

  const block = document.createElement('div');
  block.className = 'feature-row';
  items.forEach((it) => {
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    const icon = resolveGridIcon(it.icon) || it.icon.querySelector('picture, img');
    if (icon) iconCell.append(icon.cloneNode ? icon.cloneNode(true) : icon);
    const textCell = document.createElement('div');
    while (it.text.firstChild) textCell.append(it.text.firstChild);
    row.append(iconCell, textCell);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

/**
 * The credit-cards "Get the Best Credit Cards that we have to offer" section is
 * a row of product-thumbnail cards (image + card-name link). Live renders them
 * as a borderless 4-up row with rounded, shadowed thumbnails — not the default
 * bordered card-feature tiles. Tag that specific block with a `cards-feature-
 * products` variant class so the CSS can match the live layout.
 */
function tagCreditCardProducts(main) {
  const heading = [...main.querySelectorAll('h1, h2, h3, h4')]
    .find((h) => /Get the Best Credit Cards that we have to offer/i.test(h.textContent));
  if (!heading) return;
  let node = heading.nextElementSibling;
  while (node && !node.classList.contains('cards-feature')) {
    node = node.nextElementSibling;
  }
  if (node) node.classList.add('cards-feature-products');
}

/**
 * The credit-cards "Credit Cards that everyone is talking about" testimonials
 * show a 5-star rating per review. Live renders the stars with Font Awesome
 * (<i class="fa fa-star">), which EDS doesn't ship, so the migrated content kept
 * only an empty <ul><li></li></ul> placeholder per card. Fill each empty rating
 * list item with five star glyphs and tag the block so the CSS can gild them.
 */
function buildReviewStars(main) {
  const heading = [...main.querySelectorAll('h1, h2, h3, h4')]
    .find((h) => /everyone is talking about/i.test(h.textContent));
  if (!heading) return;
  let block = heading.nextElementSibling;
  while (block && !block.classList.contains('cards-feature')) {
    block = block.nextElementSibling;
  }
  if (!block) return;
  block.classList.add('cards-feature-reviews');

  block.querySelectorAll('ul > li').forEach((li) => {
    if (li.textContent.trim() || li.querySelector('*')) return;
    const stars = document.createElement('span');
    stars.className = 'review-stars';
    stars.setAttribute('aria-label', '5 star rating');
    stars.textContent = '★★★★★';
    li.append(stars);
  });
}

/**
 * The credit-cards "Credit Card offers you don't want to miss!" section is a
 * clickable carousel on the live site (offer thumbnails shown a few at a time
 * with prev/next controls). It migrated as a static `cards-feature` grid. Tag
 * that block with a `cards-feature-carousel` variant so cards-feature.js turns
 * it into a horizontally scrollable carousel.
 */
function tagCreditCardOffers(main) {
  const heading = [...main.querySelectorAll('h1, h2, h3, h4')]
    .find((h) => /Credit Card offers you don.?t want to miss/i.test(h.textContent));
  if (!heading) return;
  let node = heading.nextElementSibling;
  while (node && !node.classList.contains('cards-feature')) {
    node = node.nextElementSibling;
  }
  if (node) node.classList.add('cards-feature-carousel');
}

/**
 * The credit-cards "Get an instant Credit Card in just 3 easy steps!" section
 * migrated as a flat run of (icon <p>) + (step-title <h4>) + (description <p>)
 * triples. Live renders these as three equal columns. Group each triple into a
 * `feature-row feature-row-steps` row (icon cell + text cell) so it renders as a
 * 3-up grid.
 */
function buildCreditCardSteps(main) {
  const heading = [...main.querySelectorAll('h1, h2, h3, h4, h5')]
    .find((h) => /Get an instant Credit Card in just 3 easy steps/i.test(h.textContent));
  if (!heading) return;
  const parent = heading.parentElement;

  const isIconP = (el) => el && el.tagName === 'P'
    && el.querySelector('span.icon, picture, img') && !el.textContent.trim();

  const items = [];
  const consumed = [];
  let node = heading.nextElementSibling;
  while (node && !/^H[12]$/.test(node.tagName)) {
    let advance = node.nextElementSibling;
    const titleEl = node.nextElementSibling;
    const descEl = titleEl && titleEl.nextElementSibling;
    if (isIconP(node) && titleEl && /^H[3-6]$/.test(titleEl.tagName)) {
      const text = document.createElement('div');
      text.append(titleEl.cloneNode(true));
      consumed.push(node, titleEl);
      advance = titleEl.nextElementSibling;
      if (descEl && descEl.tagName === 'P' && descEl.textContent.trim()) {
        text.append(descEl.cloneNode(true));
        consumed.push(descEl);
        advance = descEl.nextElementSibling;
      }
      items.push({ icon: node, text });
    }
    node = advance;
  }

  if (items.length < 2) return;

  const block = document.createElement('div');
  block.className = 'feature-row feature-row-steps';
  items.forEach((it) => {
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    const icon = resolveGridIcon(it.icon) || it.icon.querySelector('picture, img');
    if (icon) iconCell.append(icon.cloneNode ? icon.cloneNode(true) : icon);
    row.append(iconCell, it.text);
    block.append(row);
  });

  consumed.forEach((el) => el.remove());
  parent.insertBefore(block, heading.nextSibling);
}

/**
 * "Fast-track your Business Growth" Special Offerings migrated as a <ul> of
 * <li><p>icon</p><p><a>label</a></p></li>. Convert it into an `icon-grid` block
 * so it renders as icon tiles.
 */
function buildFastTrackOfferings(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => h.textContent.replace(/\s+/g, ' ').trim() === 'Fast-track your Business Growth with our Banking Solutions');
  if (!heading) return;

  // the offerings list is the first <ul> after the heading
  let ul = heading.nextElementSibling;
  while (ul && ul.tagName !== 'UL' && ul.tagName !== 'H2') ul = ul.nextElementSibling;
  if (!ul || ul.tagName !== 'UL') return;

  const lis = [...ul.querySelectorAll(':scope > li')];
  if (lis.length < 2) return;

  const block = document.createElement('div');
  block.className = 'icon-grid';
  lis.forEach((li) => {
    const a = li.querySelector('a[href]');
    if (!a) return;
    const row = document.createElement('div');
    const iconCell = document.createElement('div');
    const icon = resolveGridIcon(li);
    if (icon) iconCell.append(icon);
    const labelCell = document.createElement('div');
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', a.getAttribute('href'));
    link.textContent = a.textContent.replace(/\s+/g, ' ').trim();
    p.append(link);
    labelCell.append(p);
    row.append(iconCell, labelCell);
    block.append(row);
  });

  ul.replaceWith(block);
}

/**
 * The current-accounts "Choose your establishment type to continue" block is a
 * JS form-modal that's hidden on the live site, but it leaked into the migrated
 * page's visible flow — with broken tokenized icons and a duplicated
 * Locate/Call/Write contact strip. Remove that heading and all following
 * siblings (the modal + duplicate contact blocks) so the page ends cleanly.
 */
function removeLeakedModal(main) {
  const heading = [...main.querySelectorAll('h2')]
    .find((h) => /^Choose your establishment type/i.test(h.textContent.trim()));
  if (!heading) return;
  // The heading and its leaked modal/contact siblings share a wrapper that also
  // holds preceding real content, so only remove the heading itself and the
  // sibling nodes that follow it within that wrapper (the modal + duplicated
  // Locate/Call/Write contact rows). Never remove the wrapper or earlier nodes.
  const toRemove = [];
  let node = heading;
  while (node) { toRemove.push(node); node = node.nextElementSibling; }
  toRemove.forEach((el) => el.remove());
}

/**
 * The home page renders two live "video section" tiles side by side — a YouTube
 * video card and the "Hausla hai toh ho jayega" story card — which migrated into
 * a single `cards-feature` block that lost both images. Restore them: inject the
 * video thumbnail (wrapped in the YouTube link) into the empty first card and the
 * Hausla artwork into the Hausla card. Scoped to the home page.
 */
const HOME_VIDEO_THUMB = 'https://www.kotak.bank.in/content/dam/Kotak/video-thumbnails/homepage-yt-t-690x340.jpg';
const HOME_VIDEO_HREF = 'https://www.youtube.com/embed/t7ZU1dCVpWU?autoplay=1';
const HAUSLA_IMAGE = 'https://www.kotak.bank.in/content/dam/Kotak/feature-cards/housla-hai-to-ho-jayega_girl-image.jpg';

// Open a YouTube embed in a centered lightbox overlay (like the live fancybox
// popup) instead of navigating away. Closes on backdrop click, the × button or
// Escape.
function openVideoModal(src) {
  const overlay = document.createElement('div');
  overlay.className = 'video-modal';
  overlay.innerHTML = `
    <div class="video-modal-inner">
      <button type="button" class="video-modal-close" aria-label="Close video">&times;</button>
      <div class="video-modal-frame">
        <iframe src="${src}" title="Video" allow="autoplay; encrypted-media; fullscreen"
          allowfullscreen></iframe>
      </div>
    </div>`;
  let onKey;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.video-modal-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
}

function restoreHomeVideoCards(main) {
  if (!/\/home(\/|$)/.test(window.location.pathname)) return;
  const block = [...main.querySelectorAll('.cards-feature')]
    .find((b) => /Hausla hai toh ho jayega/i.test(b.textContent));
  if (!block) return;

  // Live shows the video tile at 2/3 width next to the 1/3-width Hausla tile.
  block.classList.add('cards-feature-video');

  const cards = [...block.children];
  // First card is the empty video tile: fill it with the thumbnail + a play
  // overlay that opens the YouTube video in a popup.
  const videoCard = cards[0];
  if (videoCard && !videoCard.querySelector('img, picture')) {
    const cell = videoCard.querySelector('div:last-child') || videoCard;
    const link = document.createElement('a');
    link.href = HOME_VIDEO_HREF;
    link.className = 'home-video-link';
    link.setAttribute('aria-label', 'Play video');
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = HOME_VIDEO_THUMB;
    img.alt = 'Watch video';
    img.loading = 'lazy';
    picture.append(img);
    const play = document.createElement('span');
    play.className = 'home-video-play';
    play.setAttribute('aria-hidden', 'true');
    link.append(picture, play);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openVideoModal(HOME_VIDEO_HREF);
    });
    cell.textContent = '';
    cell.append(link);
  }

  // Hausla card: prepend its artwork into a fresh image cell.
  const hauslaCard = cards.find((c) => /Hausla hai toh ho jayega/i.test(c.textContent));
  if (hauslaCard && !hauslaCard.querySelector('img, picture')) {
    const cell = document.createElement('div');
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = HAUSLA_IMAGE;
    img.alt = 'Hausla hai toh ho jayega';
    img.loading = 'lazy';
    picture.append(img);
    cell.append(picture);
    hauslaCard.insertBefore(cell, hauslaCard.firstChild);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildSavingsHero(main);
    buildLinkColumns(main);
    buildCardCatalog(main);
    buildFeatureRow(main);
    buildCreditCardSteps(main);
    tagCreditCardProducts(main);
    buildReviewStars(main);
    tagCreditCardOffers(main);
    buildIconGrids(main);
    buildFastTrackOfferings(main);
    buildRelatedProducts(main);
    buildOffers(main);
    buildFaqAccordion(main);
    removeLeakedModal(main);
    fixTokenizedIcons(main);
    restoreBenefitsCarousel(main);
    buildExploreVariants(main);
    buildEmiCalculator(main);
    restoreHomeVideoCards(main);
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

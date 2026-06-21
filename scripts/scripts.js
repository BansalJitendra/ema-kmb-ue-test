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

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildLinkColumns(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
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

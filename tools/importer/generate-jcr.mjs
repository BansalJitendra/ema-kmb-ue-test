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

  // 1. placeholder alt cleanup
  main.querySelectorAll('img[alt]').forEach((img) => {
    if (BAD_ALT.test(img.getAttribute('alt').trim())) {
      // try the nearest heading text in the same cell/anchor as a better alt
      const scope = img.closest('a, div, p, figure') || img.parentElement;
      const h = scope && scope.querySelector('h1,h2,h3,h4,h5,h6');
      img.setAttribute('alt', h ? h.textContent.trim().slice(0, 120) : '');
    }
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

      let result;
      let hadBlocks = false;
      try {
        // preprocess: convert EDS block divs into authoring tables md2jcr understands
        const dom = new JSDOM(wrapped);
        normalizeContent(dom.window.document);
        convertBlockDivsToTables(dom.window.document, blockMeta);
        hadBlocks = !!dom.window.document.querySelector('table');
        const html = dom.serialize();
        const res = await md2jcr(url, html, undefined, opts, { components });
        result = Array.isArray(res) ? res[0] : res;
        if (!result || !result.jcr) throw new Error('no jcr output');
      } catch (blockErr) {
        // Fallback: a block failed model validation. Render the page as default
        // content (no block tables) so it still produces valid JCR.
        const res = await md2jcr(url, wrapped, undefined, opts, { components });
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

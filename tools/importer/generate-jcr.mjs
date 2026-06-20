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

async function loadComponents() {
  const models = JSON.parse(await readFile(path.join(REPO, 'component-models.json'), 'utf-8'));
  const defs = JSON.parse(await readFile(path.join(REPO, 'component-definition.json'), 'utf-8'));
  const filters = JSON.parse(await readFile(path.join(REPO, 'component-filters.json'), 'utf-8'));
  return { models, definition: defs, filters };
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
  const components = await loadComponents();
  const files = await walk(CONTENT_DIR);
  console.log(`Found ${files.length} content files`);
  let ok = 0; const failed = [];
  for (const file of files) {
    const rel = path.relative(CONTENT_DIR, file).replace(/\.plain\.html$/, '');
    const url = `https://main--ema-kmb-ue-test--bansaljitendra.aem.page/${rel}`;
    try {
      let html = await readFile(file, 'utf-8');
      // wrap fragment so the importer sees a full document with <main>
      html = `<!DOCTYPE html><html><head><title>${rel}</title></head><body><main>${html}</main></body></html>`;
      const res = await md2jcr(url, html, undefined, {
        createDocumentFromString: (s) => new JSDOM(s).window.document,
      }, { components });
      const result = Array.isArray(res) ? res[0] : res;
      if (!result || !result.jcr) throw new Error('no jcr output');
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
  console.log(`\nConverted ${ok}/${files.length} to JCR XML`);
  if (failed.length) {
    console.log(`\nFailures (${failed.length}):`);
    failed.slice(0, 20).forEach((f) => console.log('  ' + f));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

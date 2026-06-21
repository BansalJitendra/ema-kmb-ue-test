import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Build the two-level filter UI (Categories + Sub-Categories) from the unique
// tag values present on the cards. Multi-select within a group is OR; the two
// groups combine with AND, matching the live "A Credit Card for everyone" panel.
function buildFilters(block, cards) {
  const collect = (key) => {
    const set = new Set();
    cards.forEach((c) => c.dataset[key].split('|').filter(Boolean).forEach((v) => set.add(v)));
    return [...set];
  };
  const categories = collect('categories');
  const subCategories = collect('subcategories');

  const state = { categories: new Set(), subcategories: new Set() };

  const apply = () => {
    cards.forEach((card) => {
      const cats = card.dataset.categories.split('|').filter(Boolean);
      const subs = card.dataset.subcategories.split('|').filter(Boolean);
      const catSel = [...state.categories];
      const subSel = [...state.subcategories];
      const catOk = catSel.length === 0 || catSel.some((v) => cats.includes(v));
      const subOk = subSel.length === 0 || subSel.some((v) => subs.includes(v));
      card.style.display = (catOk && subOk) ? '' : 'none';
    });
    const shown = cards.filter((c) => c.style.display !== 'none').length;
    const count = block.querySelector('.cards-filter-count');
    if (count) count.textContent = `Showing ${shown} card${shown === 1 ? '' : 's'}`;
  };

  const makeDropdown = (label, options, group) => {
    const wrap = document.createElement('div');
    wrap.className = 'cards-filter-dropdown';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cards-filter-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span>${label}</span><i class="cards-filter-caret"></i>`;

    const menu = document.createElement('div');
    menu.className = 'cards-filter-menu';

    const list = document.createElement('ul');
    options.forEach((opt) => {
      const li = document.createElement('li');
      const id = `cf-${group}-${opt.replace(/\W+/g, '-').toLowerCase()}`;
      li.innerHTML = `<label for="${id}"><input type="checkbox" id="${id}" value="${opt}"><span>${opt}</span></label>`;
      list.append(li);
    });
    menu.append(list);

    const actions = document.createElement('div');
    actions.className = 'cards-filter-actions';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'cards-filter-clear';
    clear.textContent = 'Clear';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'cards-filter-apply';
    applyBtn.textContent = 'Apply';
    actions.append(clear, applyBtn);
    menu.append(actions);

    toggle.addEventListener('click', () => {
      const open = wrap.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      // close sibling dropdowns
      wrap.parentElement.querySelectorAll('.cards-filter-dropdown').forEach((d) => {
        if (d !== wrap) { d.classList.remove('open'); d.querySelector('.cards-filter-toggle').setAttribute('aria-expanded', 'false'); }
      });
    });

    clear.addEventListener('click', () => {
      menu.querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.checked = false; });
      state[group].clear();
      apply();
    });

    applyBtn.addEventListener('click', () => {
      state[group].clear();
      menu.querySelectorAll('input[type=checkbox]:checked').forEach((cb) => state[group].add(cb.value));
      apply();
      wrap.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });

    wrap.append(toggle, menu);
    return wrap;
  };

  const bar = document.createElement('div');
  bar.className = 'cards-filter-bar';

  const count = document.createElement('p');
  count.className = 'cards-filter-count';
  count.textContent = `Showing ${cards.length} cards`;

  const dropdowns = document.createElement('div');
  dropdowns.className = 'cards-filter-dropdowns';
  dropdowns.append(makeDropdown('Categories', categories, 'categories'));
  if (subCategories.length) dropdowns.append(makeDropdown('Sub-Categories', subCategories, 'subcategories'));

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cards-filter-reset';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    block.querySelectorAll('.cards-filter-menu input[type=checkbox]').forEach((cb) => { cb.checked = false; });
    state.categories.clear();
    state.subcategories.clear();
    apply();
  });

  bar.append(count, dropdowns, reset);

  // close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!bar.contains(e.target)) {
      bar.querySelectorAll('.cards-filter-dropdown.open').forEach((d) => {
        d.classList.remove('open');
        d.querySelector('.cards-filter-toggle').setAttribute('aria-expanded', 'false');
      });
    }
  });

  return bar;
}

export default function decorate(block) {
  // External image URLs come through as a link to an image file (EDS only builds
  // <picture> for ingested same-origin media). Convert such links into a
  // <picture><img> so the card image renders.
  block.querySelectorAll('a[href]').forEach((link) => {
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$|\.)/i.test(link.getAttribute('href'))) {
      const img = document.createElement('img');
      img.src = link.getAttribute('href');
      img.alt = '';
      img.loading = 'lazy';
      const picture = document.createElement('picture');
      picture.append(img);
      link.replaceWith(picture);
    }
  });

  // Each row = one card: cell 1 image, cell 2 text (title, fee, bullets, CTA),
  // plus trailing paragraphs `Categories: a, b` / `Sub-Categories: x, y` that
  // carry the filter tags.
  const ul = document.createElement('ul');
  ul.className = 'cards-filter-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-filter-card';
    moveInstrumentation(row, li);

    const cells = [...row.children];
    const imageCell = cells[0];
    const bodyCell = cells[1];

    if (imageCell) {
      imageCell.className = 'cards-filter-card-image';
      li.append(imageCell);
    }
    if (bodyCell) {
      bodyCell.className = 'cards-filter-card-body';
      // Pull out the tag paragraphs (Categories: / Sub-Categories:) into data.
      const cats = [];
      const subs = [];
      [...bodyCell.querySelectorAll('p')].forEach((p) => {
        const txt = p.textContent.trim();
        const m = txt.match(/^(Categories|Sub-Categories):\s*(.*)$/i);
        if (m) {
          const vals = m[2].split(',').map((s) => s.trim()).filter(Boolean);
          if (/^Categories$/i.test(m[1])) cats.push(...vals);
          else subs.push(...vals);
          p.remove();
        }
      });
      li.dataset.categories = cats.join('|');
      li.dataset.subcategories = subs.join('|');
      li.append(bodyCell);
    }

    ul.append(li);
  });

  // Optimize same-origin images.
  ul.querySelectorAll('picture > img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith(window.location.origin) || src.startsWith('/')) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
      moveInstrumentation(img, optimizedPic.querySelector('img'));
      img.closest('picture').replaceWith(optimizedPic);
    }
  });

  const cards = [...ul.querySelectorAll('.cards-filter-card')];
  const filterBar = buildFilters(block, cards);

  block.textContent = '';
  block.append(filterBar, ul);
}

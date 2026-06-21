import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  // External icon URLs come through as a link to an image file (EDS only builds
  // <picture> for ingested same-origin media; external SVGs stay as links).
  // Convert such links into a <picture><img> so the tile icon renders. The
  // generator appends a `?icon` query to the .svg URL so md2jcr keeps it as an
  // image rather than an icon token — match that here.
  block.querySelectorAll('a[href]').forEach((link) => {
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$|\.)/i.test(link.getAttribute('href'))) {
      const img = document.createElement('img');
      img.src = link.getAttribute('href');
      // the link text is just the raw asset URL, not a useful alt — keep the
      // icon decorative.
      img.alt = '';
      img.loading = 'lazy';
      const picture = document.createElement('picture');
      picture.append(img);
      link.replaceWith(picture);
    }
  });
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-icon-tile-card-image';
      else div.className = 'cards-icon-tile-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    // Only optimize same-origin (ingested) images; external icon URLs (e.g. the
    // svg icons hosted on the source site) are served as-is.
    if (img.src.startsWith(window.location.origin) || img.src.startsWith('/')) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      moveInstrumentation(img, optimizedPic.querySelector('img'));
      img.closest('picture').replaceWith(optimizedPic);
    }
  });
  block.textContent = '';
  block.append(ul);
}

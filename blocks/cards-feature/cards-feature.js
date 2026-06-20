import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  // External image URLs come through as a link to an image file (EDS only
  // builds <picture> for ingested same-origin media). Convert such links into
  // a <picture><img> so the card image renders.
  block.querySelectorAll('a[href]').forEach((link) => {
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$|\.)/i.test(link.getAttribute('href'))) {
      const img = document.createElement('img');
      img.src = link.getAttribute('href');
      img.alt = link.textContent.trim();
      img.loading = 'lazy';
      const picture = document.createElement('picture');
      picture.append(img);
      link.replaceWith(picture);
    }
  });
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-feature-card-image';
      else div.className = 'cards-feature-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    // Only optimize same-origin (ingested) images; external URLs are served as-is.
    if (img.src.startsWith(window.location.origin) || img.src.startsWith('/')) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      moveInstrumentation(img, optimizedPic.querySelector('img'));
      img.closest('picture').replaceWith(optimizedPic);
    }
  });
  block.textContent = '';
  block.append(ul);
}

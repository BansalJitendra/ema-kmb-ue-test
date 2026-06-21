import { createOptimizedPicture } from '../../scripts/aem.js';

// Renders side-by-side link-list columns (e.g. the credit-cards "Credit Card
// Services" / "Credit Cards Guide" / "What's New?" trio). Each row of the block
// is one column: a heading cell + a cell holding the icon-link list and an
// optional trailing "view all" link.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('link-columns-col');
    const cells = [...row.children];
    if (cells[0]) cells[0].classList.add('link-columns-head');
    if (cells[1]) cells[1].classList.add('link-columns-body');
  });

  // Serve the small icon SVGs as-is (external) or optimize same-origin ones.
  block.querySelectorAll('picture > img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith(window.location.origin) || src.startsWith('/')) {
      const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '60' }]);
      img.closest('picture').replaceWith(optimized);
    }
  });
}

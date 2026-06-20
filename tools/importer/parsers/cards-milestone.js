/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-milestone. Base: cards.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (cards convention): each milestone = one row with 2 cells.
 *   Cell 1: icon image -> field:image (alt -> media_imageAlt).
 *   Cell 2: text (year + description) -> field:text.
 * Source: `.milestone-item` (within `.row`) with a `figure img`, a
 *   `.year` span, and a description `p`.
 */
export default function parse(element, { document }) {
  const cells = [];

  let items = Array.from(element.querySelectorAll('.milestone-item'));
  if (!items.length) items = Array.from(element.querySelectorAll('.row > [class*="col"]'));

  items.forEach((item) => {
    const img = item.querySelector('figure img, img');
    const year = item.querySelector('.year');
    const desc = item.querySelector('p');
    if (!img && !year && !desc) return;

    // Cell 1 - icon image.
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - year heading + description.
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (year) {
      const h = document.createElement('h3');
      h.textContent = year.textContent.replace(/\s+/g, ' ').trim();
      parts.push(h);
    }
    if (desc) parts.push(desc.cloneNode(true));
    if (parts.length) {
      textCell.appendChild(document.createComment(' field:text '));
      parts.forEach((n) => textCell.appendChild(n));
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-milestone', cells });
  element.replaceWith(block);
}
